#!/bin/bash
export HOME=/home/nicolas
export GOPATH=$HOME/.go
export PATH=$HOME/go/bin:$HOME/.go/bin:$PATH
export DB_HOST=127.0.0.1
export DB_USER=opencode
export DB_PASSWORD=12345
export DB_NAME=mri_console
export JWT_SECRET=mri-secret-key

./mri-server
