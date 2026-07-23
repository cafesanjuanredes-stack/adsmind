#!/bin/bash
TOKEN='EAAcsR7kFHmsBSNLmZBZApIaHUD4Kw8aoNqB7f7bAuyBpoFYZB9JMi70mrdh3WK6MchMGZB2TmZAcZB3KbcBZCT71aQ3LEbtLyGiswVxthqgxJzNabeZAeuAw2bh8KZC08Y7sNYGN37NZARg7Dkax8QZB7aldybf2n9pIlCGNN5sIeCsi69u3kT4JCuv87wCjxa6ADpkSS7JXAAqmCdAZBlg1859so8sUiZB6KwVWzcRusyfjZC2RSlq8z1ZBNOfBWtzQWK7XVReOS29xx29lWiTNa3w2g1xB5zC'
BIZ='724549088393014'

echo "== 2b. Creando el usuario de sistema (con status HTTP) =="
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "https://graph.facebook.com/v21.0/$BIZ/system_users" \
  -d "name=AdMind CSJ Bot" \
  -d "role=ADMIN" \
  -d "access_token=$TOKEN"
echo
