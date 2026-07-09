for p in 762787 762807 762731 60806 61503 60788; do echo -n $p: ; sudo ls /proc/$p/fd 2>/dev/null | wc -l; done
