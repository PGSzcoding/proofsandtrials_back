import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "node:crypto";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
});

export const dynamo = DynamoDBDocumentClient.from(client);

export async function saveFileMetadata({ key, tipo, clave }) {

  const certificate = {
    id: crypto.randomUUID(),
    key,
    tipo,
    clave,
    createdAt: new Date().toISOString()
  };

  return dynamo.send(
    new PutCommand({
      TableName: "Certificates",
      ConditionExpression: "attribute_not_exists(id)",
      Item: certificate,
    })
  );
}

export async function getMetadataByClave(clave) {
  const normalizedClave = clave.trim();
  const result = await dynamo.send(
    new QueryCommand({
      TableName:"Certificates",
      IndexName: "clave-index",
      KeyConditionExpression: "#clave = :clave",
      ExpressionAttributeNames: {
        "#clave": "clave",
      },
      ExpressionAttributeValues: {
        ":clave": normalizedClave,
      },
     
    })
  );

  return result.Items ?? [];
}

export async function getFileMetadataById(id) {
  const result = await dynamo.send(
    new GetCommand({
      TableName: "Certificates",
      Key: { id },
    })
  );

  return result.Item;
}

export async function updateFileMetadataById(id,clave) {
  const result = await dynamo.send(
    new UpdateCommand({
      TableName: "Certificates",
      Key: { id },
      UpdateExpression: "SET #clave = :clave",
      ExpressionAttributeNames: {
        "#clave": "clave",
      },
      ExpressionAttributeValues: {
        ":clave": clave,
      },
      ReturnValues: "ALL_NEW",
    })
  );

  return result.Attributes;
}

export async function deleteFileMetadata(id) {
  await dynamo.send(
    new DeleteCommand({
      TableName: "Certificates",
      Key: {
        id,
      },
    })
  );
}


export async function increasseButtonCount() {
  const result = await getFileMetadataById('button_count')
  let new_result = +result.clave + 1
  const result2 = await updateFileMetadataById('button_count',new_result.toString())
  return result2;
}