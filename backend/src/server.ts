import { env } from "./config/env";
import { app } from "./app";

app.listen(env.PORT, () => {
  console.log(`codearena-api listening on port ${env.PORT} [${env.NODE_ENV}]`);
});
