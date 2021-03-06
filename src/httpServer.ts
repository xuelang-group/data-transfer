import express, { request } from 'express';
import bodyParser from 'body-parser';
import * as _ from 'lodash';
import { getUploader } from './uploader';
import { buildOssPath, transferAxi2Json, transferAxiAndCsv, transferCsv2Json, transferExcel2Json, transferJson2Csv } from './util';
import path from 'path';
import { sp, Storage } from 'suanpan_node_sdk';
import moment from 'moment';
import { TransferTypeEnum } from './common';
import * as fs from 'fs-extra';


let app = express();
app.use(bodyParser.json());

const uploadFiles = [];
const downloadFiles = [];

const uploadPath = '/tmp/httpUpload';
const downloadPath = '/tmp/httpDownload'
const fileUpload = getUploader(uploadPath);

if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath);
}

app.use(express.static(path.join(__dirname, 'web')));

// 上传文件
app.post('/axiTransfer/file/upload', fileUpload.single('originalFile'), async(req, res) => {
    console.log('upload file:', req.file);

    if (!req.file) {
      res.json({ success: false, message: 'file is required' });
      return;
    }

    try{
        const ossPath = buildOssPath();
        const ossFile = path.join(ossPath, `${Date.now()}`, req.file.originalname);
        await Storage.Instance.fPutObject(ossFile, path.normalize(req.file.path));

        uploadFiles.push({
            id: uploadFiles.length + 1,
            name: req.file.originalname,
            ossPath: ossFile,
            localPath: req.file.path,
            time: moment(Date.now()).format('YYYY-MM-DD HH:mm:ss'),
            converted: false
        });

        res.json({
            success: true,
            data: ossFile
        });
    }catch(e){
        res.json({
            success: true,
            message: e.message
        });
    }
});

// 上传文件列表
app.get('/axiTransfer/uploadFiles', async(req, res) => {
    res.json({
        success: true,
        data: uploadFiles
    })
})

// 删除上传的文件
app.get('/axiTransfer/delete/upload/:id', async(req, res) => {
    const id = req.params.id;
    try{
        uploadFiles.splice(parseInt(id) - 1, 1);
        res.json({
            success: true
        });
    }catch(e){
        res.json({
            success: false,
            message: e.message
        })
    }
})

// 上传文件列表 文件下载
app.get('/axiTransfer/uploadFile/download/:id', async(req, res) => {
    const id = parseInt(req.params.id);
    const uploadEntity = uploadFiles[id - 1];
    const filePath = uploadEntity.localPath;
    if(!fs.existsSync(filePath)){
        await Storage.Instance.fGetObject(uploadEntity.ossPath, filePath);
    }
    res.download(filePath);
})

// 转换文件
app.get('/axiTransfer/convert/:type/:id', async(req, res) => {
    const transferType = req.params.type;
    const id = parseInt(req.params.id);
    const now = `${Date.now()}`;
    try{
        const fileEntity = uploadFiles[id - 1];
        const filePath = fileEntity.localPath;

        let fileName = '';
        let ossFilePath = '';
        let localFilePath = '';

        if(!fs.existsSync(filePath)){
            await Storage.Instance.fGetObject(fileEntity.ossPath, filePath)
        }
    
        if(transferType == TransferTypeEnum.AXI2CSV){
            fileName = `${fileEntity.name.split(".")[0]}.csv`;
            localFilePath = path.join(downloadPath, now, fileName);
            transferAxiAndCsv(filePath, localFilePath);
            ossFilePath = path.join(buildOssPath(), now, fileName)
        }else if(transferType == TransferTypeEnum.CSV2AXI){
            fileName = `${fileEntity.name.split(".")[0]}.axi`;
            localFilePath = path.join(downloadPath, now, fileName);
            transferAxiAndCsv(filePath, localFilePath);
            ossFilePath = path.join(buildOssPath(), now, fileName)
        }else if(transferType == TransferTypeEnum.EXCEL2AXI){
            const csvJson = await transferExcel2Json(filePath);
            fileName = `${fileEntity.name.split(".")[0]}.axi`;
            localFilePath = path.join(downloadPath, now, fileName);
            transferJson2Csv(csvJson, localFilePath);
            ossFilePath = path.join(buildOssPath(), now, fileName)
        }else if(transferType == TransferTypeEnum.EXCEL2CSV){
            const axiJson = await transferExcel2Json(filePath);
            fileName = `${fileEntity.name.split(".")[0]}.csv`;
            localFilePath = path.join(downloadPath, now, fileName);
            transferJson2Csv(axiJson, localFilePath);
            ossFilePath = path.join(buildOssPath(), now, fileName)
        }else{
            res.json({
                success: false,
                message: `un support transfer type ${transferType}`
            })
            return;
        }
        await Storage.Instance.fPutObject(ossFilePath, localFilePath);
        downloadFiles.push({
            id: downloadFiles.length + 1,
            name: fileName,
            ossPath: ossFilePath,
            localPath: localFilePath,
            time: moment(Date.now()).format('YYYY-MM-DD HH:mm:ss'),
        })
        fileEntity.converted = true;
        res.json({
            success: true
        })
    }catch(e){
        res.json({
            success: false,
            message: e.message
        })
    }
})

// 下载文件列表
app.get('/axiTransfer/download/files', async(req, res) => {
    res.json({
        success: true,
        data: downloadFiles
    })
})

// 下载文件
app.get('/axiTransfer/download/:id', async(req, res) => {
    const id = parseInt(req.params.id);
    const downloadEntity = downloadFiles[id - 1];
    const filePath = downloadEntity.localPath;
    if(!fs.existsSync(filePath)){
        await Storage.Instance.fGetObject(downloadEntity.ossPath, filePath);
    }
    res.download(filePath);
});

// 删除下载列表中的文件
app.get('/axiTransfer/delete/download/:id', async(req, res) => {
    const id = req.params.id;
    try{
        downloadFiles.splice(parseInt(id) - 1, 1);
        res.json({
            success: true
        });
    }catch(e){
        res.json({
            success: false,
            message: e.message
        })
    }
})

export function initHttpServer(){
    app.listen(8800, () => {
        console.log(`http server is listening at 8800`);
    });
}


