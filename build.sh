#!/bin/bash

set -x

image=axi-data-transfer
tag=1.0.9
registry=registry.cn-shanghai.aliyuncs.com/shuzhi-amd64
repo=${registry}/${image}:${tag}

docker build -t ${repo} .
docker push ${repo}
