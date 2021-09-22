import csv from 'csvtojson';
import csvjson from 'csvjson';
import * as fs from 'fs-extra';
import * as exceljson from 'excel-as-json';
import { async } from 'node-stream-zip';

function getEnv(name) {
    return process.env[name];
  }
  
  const userId = getEnv('SP_USER_ID');
  const appId = getEnv('SP_APP_ID');
  const nodeId = getEnv('SP_NODE_ID');

export function transferAxi2Json(filePath: string){
    let file = fs.readFileSync(filePath, {encoding : 'utf8'})
    let options = {
        delimiter: ','
    }
    return csvjson.toObject(file, options);
}

export function transferCsv2Json(filePath: string){
    let file = fs.readFileSync(filePath, {encoding : 'utf8'})
    let options = {
        delimiter: ','
    }
    return csvjson.toObject(file, options);
}

export async function transferExcel2Json(filePath: string): Promise<string>{
    return new Promise((resolve, reject) => {
        const convertExcel = exceljson.processFile;
        let ret = '';
        convertExcel(filePath, undefined, {
            sheet: '1'
        }, (err, data) => {
            if(err){
                console.error(err.message);
                reject(err.message);
            }
            resolve(data);
        });
    })
}

export function transferJson2Csv(jsonStr: string,filePath: string){
    let options = {
        delimiter: ',',
        wrap: false,
        headers: 'key'
    }
    const data = csvjson.toCSV(jsonStr, options);
    if (!fs.existsSync(filePath)){
        fs.ensureFileSync(filePath);
    }
    fs.writeFileSync(filePath, data);
}

export function buildOssPath(){
    return `studio/${userId}/${appId}/${nodeId}`;
}

async function test(){
    // let pa = transferCsv2Json('/Users/luotao/Desktop/param.csv');
    // let pa = transferAxi2Json('/Users/luotao/Desktop/test.axi');
    let pa = await transferExcel2Json('/Users/luotao/Desktop/inputParam.xlsx');
    console.log(pa)
    // transferJson2Csv(pa,'/Users/luotao/Desktop/test33/test2.csv');
}




