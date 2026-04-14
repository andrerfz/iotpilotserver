#!/usr/bin/env sh
[ "$HUSKY" = "2" ] && set -x
h="$HOME/.config/husky"
[ -s "$h/init.sh" ] && . "$h/init.sh"
