import path from "path";

import * as fs from "fs";

export default class SchemaComposer {
  readonly tableName: string;
  readonly SCHEMA_PATH = path.resolve(__dirname, "../schemas");

  constructor(readonly _tableName: string) {
    this.tableName = _tableName;
  }

  private extractTableSchemaName(): string[] {
    return fs.readdirSync(path.resolve(this.SCHEMA_PATH, this.tableName));
  }

  private formatSnakeCaseToCamelCase(str: string): string {
    return str.replace(/(_\w)/g, (m) => m[1].toUpperCase());
  }

  composeTableSchema(): Record<string, string> {
    const schemaNames = this.extractTableSchemaName();

    const schema: Record<string, string> = {};

    for (const schemaName of schemaNames) {
      const formattedSchemaName =
        this.formatSnakeCaseToCamelCase(schemaName).split(".")[0];
      schema[formattedSchemaName] = fs.readFileSync(
        path.resolve(this.SCHEMA_PATH, this.tableName, schemaName),
        "utf8"
      );
    }

    return schema;
  }
}
