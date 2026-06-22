package services

import (
	"fmt"
	"math"
	"strings"

	"github.com/scrmhoot/mri-backend/internal/models"
)

type ScoringService struct{}

func NewScoringService() *ScoringService {
	return &ScoringService{}
}

func (s *ScoringService) Evaluate(params models.ExamParams, sequence models.Sequence) EvaluationResult {
	var checks []models.ParameterCheck
	var errors []models.ErrorPoint
	var recommendations []models.Recommendation

	planScore := 100.0
	contrastScore := 100.0
	centerScore := 100.0

	if sequence.TRMin > 0 {
		trCheck := s.checkTR(params.TR, sequence.TRMin, sequence.TRMax)
		checks = append(checks, trCheck)
		if trCheck.Status == "error" {
			planScore -= 10
			errors = append(errors, models.ErrorPoint{
				Type:        "tr_out_of_range",
				Severity:    0.8,
				Description: trCheck.Message,
			})
		} else if trCheck.Status == "warning" {
			planScore -= 5
			recommendations = append(recommendations, models.Recommendation{
				Level: "warning",
				Text:  trCheck.Message,
			})
		}
	}

	if sequence.TEMin > 0 {
		teCheck := s.checkTE(params.TE, sequence.TEMin, sequence.TEMax)
		checks = append(checks, teCheck)
		if teCheck.Status == "error" {
			contrastScore -= 15
			errors = append(errors, models.ErrorPoint{
				Type:        "te_out_of_range",
				Severity:    0.7,
				Description: teCheck.Message,
			})
		} else if teCheck.Status == "warning" {
			contrastScore -= 5
			recommendations = append(recommendations, models.Recommendation{
				Level: "warning",
				Text:  teCheck.Message,
			})
		}
	}

	fovCheck := s.checkFOV(params.FOVRead, params.FOVPhase, sequence.FOVMin, sequence.FOVMax)
	checks = append(checks, fovCheck)
	if fovCheck.Status == "error" {
		planScore -= 15
		errors = append(errors, models.ErrorPoint{
			Type:        "fov_inadequate",
			Severity:    0.9,
			Description: fovCheck.Message,
		})
	} else if fovCheck.Status == "warning" {
		planScore -= 5
		recommendations = append(recommendations, models.Recommendation{
			Level: "warning",
			Text:  fovCheck.Message,
		})
	}

	sliceCheck := s.checkSliceThickness(params.SliceThickness, sequence.SliceThicknessMin, sequence.SliceThicknessMax)
	checks = append(checks, sliceCheck)
	if sliceCheck.Status == "error" {
		planScore -= 10
		errors = append(errors, models.ErrorPoint{
			Type:        "slice_thickness_inadequate",
			Severity:    0.6,
			Description: sliceCheck.Message,
		})
	} else if sliceCheck.Status == "warning" {
		planScore -= 3
	}

	if sequence.FlipAngleMin > 0 && sequence.FlipAngleMax > 0 {
		flipCheck := s.checkFlipAngle(params.FlipAngle, sequence.FlipAngleMin, sequence.FlipAngleMax)
		checks = append(checks, flipCheck)
		if flipCheck.Status == "error" {
			contrastScore -= 10
			recommendations = append(recommendations, models.Recommendation{
				Level: "warning",
				Text:  flipCheck.Message,
			})
		}
	}

	if sequence.MatrixMin > 0 && sequence.MatrixMax > 0 {
		matrixCheck := s.checkMatrix(params.MatrixSize, sequence.MatrixMin, sequence.MatrixMax)
		checks = append(checks, matrixCheck)
		if matrixCheck.Status == "error" {
			planScore -= 8
			recommendations = append(recommendations, models.Recommendation{
				Level: "info",
				Text:  matrixCheck.Message,
			})
		}
	}

	if sequence.NEXMin > 0 && sequence.NEXMax > 0 {
		nexCheck := s.checkNEX(params.NEX, sequence.NEXMin, sequence.NEXMax)
		checks = append(checks, nexCheck)
		if nexCheck.Status == "error" {
			planScore -= 5
		}
	}

	centerScore = s.evaluateCentering(params)

	planScore = math.Max(0, math.Min(100, planScore))
	contrastScore = math.Max(0, math.Min(100, contrastScore))
	centerScore = math.Max(0, math.Min(100, centerScore))

	finalScore := planScore*0.30 + centerScore*0.30 + contrastScore*0.40

	return EvaluationResult{
		Score: models.ScoreBreakdown{
			Total:         finalScore,
			Planificacion: planScore,
			Centraje:      centerScore,
			Contraste:     contrastScore,
		},
		Checks:          checks,
		Heatmap:         models.HeatmapData{Errors: errors},
		Recommendations: recommendations,
	}
}

func (s *ScoringService) checkTR(tr, trMin, trMax float64) models.ParameterCheck {
	check := models.ParameterCheck{
		Param:    "TR",
		Value:    tr,
		Expected: formatRange(trMin, trMax, "ms"),
	}

	if tr < trMin {
		check.Status = "error"
		check.Message = fmt.Sprintf("TR %.0f por debajo del mínimo (%.0fms). Contraste T1 comprometido.", tr, trMin)
	} else if tr > trMax {
		check.Status = "error"
		check.Message = fmt.Sprintf("TR %.0f por encima del máximo (%.0fms). Puede causar saturación T1.", tr, trMax)
	} else if tr < trMin*1.1 {
		check.Status = "warning"
		check.Message = "TR está en el límite inferior del rango óptimo"
	} else {
		check.Status = "ok"
	}

	return check
}

func (s *ScoringService) checkTE(te, teMin, teMax float64) models.ParameterCheck {
	check := models.ParameterCheck{
		Param:    "TE",
		Value:    te,
		Expected: formatRange(teMin, teMax, "ms"),
	}

	if te < teMin {
		check.Status = "error"
		check.Message = fmt.Sprintf("TE %.0f demasiado bajo (mín: %.0fms). Peso T2 insuficiente.", te, teMin)
	} else if te > teMax {
		check.Status = "error"
		check.Message = fmt.Sprintf("TE %.0f demasiado alto (máx: %.0fms). Decaimiento T2 excesivo.", te, teMax)
	} else if te > teMax*0.9 {
		check.Status = "warning"
		check.Message = "TE está en el límite superior del rango óptimo"
	} else {
		check.Status = "ok"
	}

	return check
}

func (s *ScoringService) checkFOV(fovRead, fovPhase, fovMin, fovMax float64) models.ParameterCheck {
	check := models.ParameterCheck{
		Param:    "FOV",
		Value:    fovRead,
		Expected: formatRange(fovMin, fovMax, "mm"),
	}

	if fovRead < fovMin {
		check.Status = "error"
		check.Message = "FOV demasiado pequeño, no cubre la región anatómica completa"
	} else if fovRead > fovMax {
		check.Status = "error"
		check.Message = "FOV demasiado grande, resolución efectiva reducida"
	} else if fovPhase < fovMin*0.8 {
		check.Status = "warning"
		check.Message = "FOV de fase puede ser insuficiente"
	} else {
		check.Status = "ok"
	}

	return check
}

func (s *ScoringService) checkSliceThickness(thickness, min, max float64) models.ParameterCheck {
	check := models.ParameterCheck{
		Param:    "Slice Thickness",
		Value:    thickness,
		Expected: formatRange(min, max, "mm"),
	}

	if thickness < min {
		check.Status = "error"
		check.Message = "Slice demasiado delgado, relación señal/ruido insuficiente"
	} else if thickness > max {
		check.Status = "error"
		check.Message = "Slice demasiado grueso, resolución diagnóstica comprometida"
	} else if thickness > max*0.9 {
		check.Status = "warning"
		check.Message = "Slice cerca del límite grueso"
	} else {
		check.Status = "ok"
	}

	return check
}

func (s *ScoringService) checkFlipAngle(fa, min, max float64) models.ParameterCheck {
	check := models.ParameterCheck{
		Param:    "Flip Angle",
		Value:    fa,
		Expected: formatRange(min, max, "°"),
	}

	if fa < min {
		check.Status = "error"
		check.Message = "Flip angle muy bajo, señal reducida"
	} else if fa > max {
		check.Status = "error"
		check.Message = "Flip angle muy alto, riesgo de artefactos SAR"
	} else {
		check.Status = "ok"
	}

	return check
}

func (s *ScoringService) checkMatrix(matrix, min, max int) models.ParameterCheck {
	check := models.ParameterCheck{
		Param:    "Matrix",
		Value:    matrix,
		Expected: formatIntRange(min, max),
	}

	if matrix < min {
		check.Status = "error"
		check.Message = "Matriz muy baja, resolución espacial insuficiente"
	} else if matrix > max {
		check.Status = "error"
		check.Message = "Matriz muy alta, tiempo de adquisición excesivo"
	} else {
		check.Status = "ok"
	}

	return check
}

func (s *ScoringService) checkNEX(nex, min, max float64) models.ParameterCheck {
	check := models.ParameterCheck{
		Param:    "NEX",
		Value:    nex,
		Expected: formatRange(min, max, "averages"),
	}

	if nex < min {
		check.Status = "error"
		check.Message = "Pocos promedios, SNR bajo"
	} else if nex > max {
		check.Status = "warning"
		check.Message = "Muchos promedios, tiempo excesivo"
	} else {
		check.Status = "ok"
	}

	return check
}

func (s *ScoringService) evaluateCentering(params models.ExamParams) float64 {
	score := 100.0

	isocenterMagnitude := math.Sqrt(params.IsocenterX*params.IsocenterX +
		params.IsocenterY*params.IsocenterY + params.IsocenterZ*params.IsocenterZ)

	if isocenterMagnitude > 50 {
		score -= 30
	} else if isocenterMagnitude > 20 {
		score -= 15
	} else if isocenterMagnitude > 10 {
		score -= 5
	}

	return math.Max(0, score)
}

func (s *ScoringService) CalculateQualityMetrics(params []models.ParametrosSecuencia) models.QualityMetrics {
	var totalSNR, totalCNR, totalNoise, totalArtifacts float64
	count := float64(len(params))

	if count == 0 {
		return models.QualityMetrics{SNR: 0, Contraste: 0, Ruido: 100, Artifacts: 0}
	}

	for _, p := range params {
		nexFactor := math.Sqrt(math.Max(1, p.NEX))
		baseSNR := 50.0 + (nexFactor * 10)
		snr := baseSNR * (p.FovRead / 220)

		var contrast float64 = 30
		if p.TR > 2000 && p.TE > 80 {
			contrast = 60 + (p.TE / 150)
		} else if p.TR < 800 {
			contrast = 70 + (150 - p.TR) / 20
		}

		noise := 100.0 / (nexFactor * (float64(p.MatrixSize) / 256))

		var artifacts float64 = 5
		if !p.FatSat {
			artifacts += 10
		}
		if p.FovPhase < p.FovRead*0.7 {
			artifacts += 5
		}

		totalSNR += snr
		totalCNR += contrast
		totalNoise += noise
		totalArtifacts += artifacts
	}

	return models.QualityMetrics{
		SNR:       math.Round(totalSNR/count*100) / 100,
		Contraste: math.Round(totalCNR/count*100) / 100,
		Ruido:     math.Round(totalNoise/count*100) / 100,
		Artifacts: math.Round(totalArtifacts/count*100) / 100,
	}
}

func getSequenceType(nombre string) string {
	nombre = strings.ToUpper(nombre)
	if strings.Contains(nombre, "DWI") || strings.Contains(nombre, "EPI") || strings.Contains(nombre, "DIFFUSION") {
		return "DWI"
	}
	if strings.Contains(nombre, "FLAIR") {
		return "FLAIR"
	}
	if strings.Contains(nombre, "T1") || strings.Contains(nombre, "MPRAGE") || strings.Contains(nombre, "SPGR") {
		return "T1"
	}
	if strings.Contains(nombre, "T2") || strings.Contains(nombre, "TSE") {
		return "T2"
	}
	return "PD"
}

type EvaluationResult struct {
	Score           models.ScoreBreakdown
	Checks          []models.ParameterCheck
	Heatmap         models.HeatmapData
	Recommendations []models.Recommendation
}

func formatRange(min, max float64, unit string) string {
	return fmt.Sprintf("%.0f - %.0f %s", min, max, unit)
}

func formatIntRange(min, max int) string {
	return fmt.Sprintf("%dx%d", min, max)
}
