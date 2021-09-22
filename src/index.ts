import path from 'path';
import { sp, Storage } from 'suanpan_node_sdk';
import { TransferTypeEnum } from './common';
import { initHttpServer } from './httpServer';
import { buildOssPath, transferAxi2Json, transferCsv2Json, transferJson2Csv } from './util';

console.log('node arguments:', sp.parameter);

const { transferTypeInParam, originalFileInParam } = sp.parameter;

const debug = process.env.SP_DEBUG === 'true';

const downloadPath = '/tmp/download';
const uploadPath = '/tmp/upload';

interface DataTransferRequest {
    transferType,
    originalFile
}

async function bootstrap(){
    initHttpServer();
    sp.onCall( async(req, res) => {
        const message = req.msg['in1'];
        console.log(`data transfer received request: ${message}`);
        
        try {
          const request: DataTransferRequest = JSON.parse(message);
          const originalFile = request.originalFile || originalFileInParam;
    
          const filename = path.parse(originalFile).base;
          const now = `${Date.now()}`
          const tmpFile = path.join(downloadPath, now, filename);
    
          const transferType = request.transferType || transferTypeInParam;
    
          console.log(`filename = ${filename}, tmpFile = ${tmpFile}`);
          await Storage.Instance.fGetObject(originalFile, tmpFile)
          let ossFilePath = "";
    
          switch (transferType){
            case TransferTypeEnum.AXI2CSV:
                console.log('start axi to csv');
                const csvFileName = `${filename.split(".")[0]}.csv`;
                const csvFilePath = path.join(uploadPath, now, csvFileName);
                const axiJson = transferAxi2Json(tmpFile);
                console.log(`transfer to json : ${JSON.stringify(axiJson)}`);
                transferJson2Csv(axiJson, csvFilePath);
                ossFilePath = path.join(buildOssPath(), now, csvFileName);
                await Storage.Instance.fPutObject(ossFilePath, csvFilePath);
            case TransferTypeEnum.CSV2AXI:
                console.log('start csv to axi');
                const axiFileName = `${filename.split(".")[0]}.axi`;
                const axiFilePath = path.join(uploadPath, now, axiFileName);
                const csvJson = transferCsv2Json(tmpFile);
                console.log(`transfer to json : ${JSON.stringify(csvJson)}`);
                transferJson2Csv(csvJson, axiFilePath);
                console.log(`transfer json to axi done`);
                ossFilePath = path.join(buildOssPath(), now, axiFileName);
                await Storage.Instance.fPutObject(ossFilePath, axiFilePath);
          }
    
          sp.sendMessage({
              out1: JSON.stringify({
                  success: true,
                  data: ossFilePath
              })
          })
        
        }catch(e){
            console.error(`error message: ${e.message}`);

            sp.sendMessage({
                success: false,
                message: e.message
            })
    
        }
    });
}

bootstrap().catch(e => {
    console.error(`axi data transfer bootstrap failed: ${e.message}`);
    process.exit(-1);
  });

