const {app, BrowserWindow} = require ('electron/remote');
const fs = require('fs'); // why not {fs}?
const {dialog, ipcRenderer} = require('electron');
const { ipcMain } = require('electron');
let folderConfigs = {}

ipcMain.on('folderSelect',(event) =>{
    //opens explorer and sends back selected folder
    let explorerData =  dialog.showOpenDialogSync ({properties:['openDirectory']})
    event.returnValue = explorerData
})
ipcMain.on('getFiles',(event,folders)=>{
    //when give folder paths sends back file paths 
    let filePaths = []

    for (let folder of folders){


        //get all file names in a folder
        let fileNames = fs.readdirSync(folder)
        for(let i = 0; i < fileNames.length; i ++){
            //add full path to file
            fileNames[i] = folder + '/'+fileNames[i] 
        }

        //add paths to the main array
        filePaths = filePaths.concat(fileNames) 
    }

    //return files
    event.returnValue = filePaths
})

ipcMain.on('addConfig',(event, name, folders)=>{
    //write to object
    folderConfigs[name] = folders
    //write object to file
    fs.writeFileSync('folderConfigs.JSON',JSON.stringify(folderConfigs))
    //confirm success
    event.returnValue = true
})
ipcMain.on('deleteConfig',(event, name)=>{
    delete folderConfigs[name]
    fs.writeFileSync('folderConfigs.JSON',JSON.stringify(folderConfigs))
    event.returnValue = true
})
ipcMain.on('loadConfig',(event, name)=>{
    //returns array of folders
    event.returnValue = folderConfigs[name]
})
ipcMain.on('loadAllConfigs',(event)=>{
    event.returnValue = folderConfigs
})
function getConfigObject(){
    try{
        let data = fs.readFileSync('folderConfigs.JSON')
            //file exists
            folderConfigs = JSON.parse(data) 
    
    }catch{
    }
    
}



function createWindow() {
    getConfigObject()
    const win = new BrowserWindow({
        width: 800,
        height: 400,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation:false,
          
        },
        show:false
    })
    win.show()
    win.loadFile('index.html')

   

    ipcMain.on('fullscreen', (event,isfullScreen)=>{
        //toggle maximize or minimize the screen
        if(isfullScreen){
            win.unmaximize()
        }else{
            win.maximize()
        }
    
        event.return = true
        
    })
    
}




app.whenReady().then(() =>{
    createWindow()
    
    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})