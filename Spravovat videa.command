#!/bin/zsh
# Dvojklik: spustí web na tomhle počítači a otevře správu videí.
cd "$(dirname "$0")"
python3 sprava/server.py
