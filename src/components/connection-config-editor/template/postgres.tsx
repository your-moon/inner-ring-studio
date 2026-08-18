import { ConnectionTemplateList } from "@/app/(outerbase)/base-template";
import { GENERIC_CONNECTION_TEMPLATE } from "./generic";

export const PostgresConnectionTemplate: ConnectionTemplateList = {
  template: GENERIC_CONNECTION_TEMPLATE,
  localFrom: (value) => {
    return {
      name: value.name,
      host: value.host,
      port: value.port,
      username: value.username,
      password: value.password,
      database: value.database,
      ssl: value.ssl,
    };
  },
  localTo: (value) => {
    return {
      name: value.name,
      driver: "postgres",
      host: value.host,
      port: value.port,
      username: value.username,
      password: value.password,
      database: value.database,
      ssl: value.ssl,
    };
  },
  remoteFrom: (value) => {
    return {
      name: value.name,
      host: value.source.host,
      username: value.source.user,
      database: value.source.database,
      port: value.source.port,
    };
  },
  remoteTo: (value) => {
    return {
      name: value.name,
      source: {
        host: value.host,
        user: value.username,
        password: value.password,
        database: value.database,
        port: value.port,
        type: "postgres",
        base_id: "",
      },
    };
  },
};
