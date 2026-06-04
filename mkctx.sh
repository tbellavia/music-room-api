#!/bin/bash

if [[ ! "$1" ]]; then
    echo "usage: ./mkctx.sh [context-name]"
    exit 1
fi

CTX="$1"

mkdir -p src/"$CTX"/{application,domain,infrastructure,interface}
mkdir -p src/"$CTX"/application/{ports,use-cases}
mkdir -p src/"$CTX"/interface/http

# NestJS setup
nest g module "$CTX"
nest g controller "$CTX/interface/http/$CTX" --flat --no-spec