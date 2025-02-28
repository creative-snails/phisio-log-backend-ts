interface Config {
  MONGO_HOST: string;
  MONGO_PORT: number;
  MONGO_USERNAME: string;
  MONGO_PASSWORD: string;
  MONGO_DB: string;
}

const config: Config = {
  MONGO_HOST: process.env.MONGO_HOST || "localhost",
  MONGO_PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 27017,
  MONGO_USERNAME: process.env.MONGO_INITDB_ROOT_USERNAME || "",
  MONGO_PASSWORD: process.env.MONGO_INITDB_ROOT_PASSWORD || "",
  MONGO_DB: process.env.MONGO_INITDB_DATABASE || "phisiologdb",
};

export default config;
