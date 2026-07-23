#!/bin/bash
TOKEN='EAAcsR7kFHmsBSNLmZBZApIaHUD4Kw8aoNqB7f7bAuyBpoFYZB9JMi70mrdh3WK6MchMGZB2TmZAcZB3KbcBZCT71aQ3LEbtLyGiswVxthqgxJzNabeZAeuAw2bh8KZC08Y7sNYGN37NZARg7Dkax8QZB7aldybf2n9pIlCGNN5sIeCsi69u3kT4JCuv87wCjxa6ADpkSS7JXAAqmCdAZBlg1859so8sUiZB6KwVWzcRusyfjZC2RSlq8z1ZBNOfBWtzQWK7XVReOS29xx29lWiTNa3w2g1xB5zC'
BIZ='724549088393014'

echo "== 1. Verificando que el token sirva =="
curl -s "https://graph.facebook.com/v21.0/me?access_token=$TOKEN"
echo
echo
echo "== 2. Creando el usuario de sistema =="
curl -s -X POST "https://graph.facebook.com/v21.0/$BIZ/system_users" \
  -d "name=AdMind CSJ Bot" \
  -d "role=ADMIN" \
  -d "access_token=$TOKEN"
echo
