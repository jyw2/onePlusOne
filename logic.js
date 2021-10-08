const { ipcRenderer } = require('electron')

window.$ = window.jQuery = require('./jquery-3.6.0.min.js')

let time 
let folders = new Set()
let filePaths = ['assets/test1.png','assets/test2.png','assets/test3.png']
let intervalId
let barInterval
let progress = 0
let isPaused = false
let noTimer = false
let isMenuHidden = false

//Selections
let overlay = $('#overlay')
let selectedFolders = $('#selectedFolders')
let mainImage = $('#mainImg')
let togglePausePlay = $('#pause')
let timeInput = $('#time')
let dropDown = $('#dropDown')
let topMenuButtons = $('#topMenuButtons')
let progressBar = $('#progressBar')
let folderDropdown = $('#folderDropdown')
let deleteDropdown = $('#deleteDropdown')
let alert = $('#alert')
let preloader = $('#preloader').hide()
let transitionTime = 800

//event Listeners
let addFoldersButton = $("#add").on("click",()=>{
    //add a folder to the list
    addFolder()
})

let startButton = $('#start').on("click",()=>{
    open()
})

let endButton = $('#exit').on("click",()=>{
    end()
})
togglePausePlay.on("click", ()=>{
    toggle()
})
let nextButton = $('#next').on('click',()=>{
    manualNextSlide()
})
let expand  = $('#expand').on('click', ()=>{
    toggleMenu()
})
let save = $('#save').on('click', ()=>{
    saveConfig()
})

//Main startup script loading configs from file
let configs = ipcRenderer.sendSync('loadAllConfigs')
for(let config in configs){
    addConfigUI(config)
}

//overlay Functions
function open(){
    //bring overlay up and start slides
  
    if(getFoldersArray().length == 0){    
        flashAlert('No folders selected.')
        return
    }
    //Repopulate image array
    populateFiles()

    //enable buttons
    nextButton.removeClass('disabled')
    togglePausePlay.removeClass('disabled')

    //change vars if no-time is selected
    time = timeInput.val()
    if(time > 0){
        //Time was input
        time = timeInput.val()
        noTimer = false
        $('#progressBarOutline').show()
        progressBar.show()
    }else{
        //No time was input, switch to manual mode
        noTimer = true
        togglePausePlay.addClass('disabled')
        $('#progressBarOutline').hide()
        progressBar.hide()
    }

    //Bring in overlay
    overlay.hide().fadeIn(600)
    overlay.css('z-index', '10')
    isPaused = false
    
    ipcRenderer.send('fullscreen',false)
    startSlides()
}

function toggleMenu(){
    //Toggles overlay menu
    if(isMenuHidden){
        //show menu
        dropDown.children().show()
        topMenuButtons.children().show()
        progressBar.hide()
        dropDown.css('padding',10)
    }else{
        //hide menu
        dropDown.children().hide()
        topMenuButtons.children().hide()
        dropDown.css('padding',0)
    }

    isMenuHidden = !isMenuHidden
}

function toggle(){
    //toggles playing or pausing slideshow
    if(isPaused){
        //Play slide show
        playSlides()
    }else{
        //pause slide show
        pauseSlides()
    }
}

function manualNextSlide(){
    //called when the arrow is pressed to switch slides
        pauseSlides() // stops timer
        startSlides()// restarts timer
}

function pauseSlides(){
    //pauses slides
    if(!noTimer){
        clearInterval(barInterval)
        clearInterval(intervalId)
        isPaused = true
        togglePausePlay.html('Play')
    }
    
}
function resetBar(){
    //resets the progress bar and makes it increment
    //function should be recalled right as progress reaches 100%
    progress = 0
    progressBar.css('width', 0)
    clearInterval(barInterval)
    barInterval = setInterval(() => {
        progress++
        progressBar.css('width', progress + '%')

        //stop when 100% reached
        if (progress == 100){
            clearInterval(barInterval)
        }
    }, (time*60000)/100);
}

function zeroBar(){
    //makes bar zero
    progressBar.css('width', 0)
}

function startSlides(){
    //Switches the image instantly and starts the timer for next image if needed
    if(!noTimer){
        // each image has a timer

        //show new image
        changeImage()

        //show an image at a specefic interval
        isPaused = false
        intervalId = setInterval(()=>{
            changeImage()
        }, time*60000+transitionTime*2)
        togglePausePlay.html('Pause')

        
    }else{
        //no timer, no auto switching images
       changeImage()
        
    }
}

function playSlides(){
     //starts the timer for next image without instantly changing the image
        isPaused = false
        togglePausePlay.html('Pause')
        resetBar()
         
        //loop
        intervalId = setTimeout(()=>{
            startSlides()
        }, time*60000)
           
}

function changeImage(){
    //changes image in the overlay 
    //takes transitionTime*2 time to complete

    let file = randomFile()
    if(file || file == 0){
        //not null = still have images available
       
        //preload image
        preloader.attr('src', file)

        //fade prev image
        mainImage.fadeOut(transitionTime)
        setTimeout(()=>{
            
            //show image
            //clear progress bar
            progressBar.css('width', 0)
            mainImage.attr('src', file )
            mainImage.hide().fadeIn(transitionTime)

            setTimeout(()=>{
                //start bar timer
                resetBar()
            },transitionTime)
        },transitionTime)
    }else{
        //no more images, show placeholder
        mainImage.fadeOut(transitionTime)
        setTimeout(()=>{
            mainImage.attr('src','assets/emptyImage.jpg')
            mainImage.hide().fadeIn(transitionTime)
        },transitionTime)
       
       
        pauseSlides()
        togglePausePlay.addClass('disabled')
        nextButton.addClass('disabled')
    }
}

function end(){
    //close overlay

    overlay.fadeOut(1000)
    setTimeout(()=>{
        overlay.css('z-index', '-1')
        pauseSlides()
        ipcRenderer.send('fullscreen',true)
        mainImage.attr('src','')
        zeroBar()
    }, 600)
}


//dashboard Functions

//File Functions
function populateFiles(){
    //populates file paths
    filePaths = ipcRenderer.sendSync('getFiles',getFoldersArray())
}

function removeFolder(path){
    //deletes folder from data but not UI
    folders.delete(path)
}


function addFolder(){
    //open explorer in main proccess
    let explorerData = ipcRenderer.sendSync('folderSelect')
    //check to make sure a valid folder was selected
    if (explorerData){
        let folderToAdd = explorerData[0]
        addFolderUI(folderToAdd)
    }
    
}

function addFolderUI(name){
    //adds folder
    folders.add(name)
    let tempElement = $( '<div class="list-group-item clickable">...'+name.substring(name.length-30)+'</div>')
    selectedFolders.prepend(tempElement)
    tempElement.hide().fadeIn(500)

    //add listener to remove folder when clicked
    tempElement.on('click',()=>{
        removeFolder(name)
        tempElement.fadeOut(300)
        setTimeout(()=>{
            tempElement.remove()
        },300)
       
    } )
}

function getFoldersArray(){
    //copies all folders from an array 
    return Array.from(folders)
}

function randomFile(){
    //returns a random file path from the folders

    if(filePaths.length < 1){
        //no more images
        return null
    }else{
        let randomIndex =  Math.round(Math.random()*(filePaths.length - 1))
        let path =  filePaths[randomIndex]
        filePaths.splice(randomIndex,1)
        return path
    }
   
}


//Config Functions
function deleteConfig(loadElement,deleteElement, name){
    //remove an element
    loadElement.remove()
    deleteElement.remove()
    ipcRenderer.sendSync('deleteConfig',name)
    delete configs[name]
    flashAlert('Config Deleted')
}

function loadConfig(name){
    //load folder config
    let res = ipcRenderer.sendSync('loadConfig',name)
    if(res){
        clearFolders()
        for(let folder of res){
            addFolderUI(folder)
        }
        flashAlert('Load Success')
        $('#configName').val(name)
    }else{
        flashAlert('Load Failed')
    }
}

function clearFolders(){
    //remove all folders
    folders.clear()
    selectedFolders.empty()
}

function saveConfig(){
    //save folder config

    //get config name
    let name = $('#configName').val()

    
    //send call to main proccess to write to file the config
    let res = ipcRenderer.sendSync('addConfig',name, getFoldersArray())
    
    if(res){
        //successful save
        flashAlert('Config saved')

        if(!configs.hasOwnProperty(name)){
            //prevent duplicate config names in drop downs
   
            //add to ui as the config is new
             addConfigUI(name)
        }else{
            //config exists, we are updating
        }        

    }else{
        flashAlert('Config failed to save')
    }
}
function addConfigUI(name){
    //adds a config as a drop down item that shows the name
    let loadElement = $('<li ><a class ="dropdown-item" href="#">'+name+'</a></li>')
    folderDropdown.prepend(loadElement)
    loadElement.on('click',()=>{
        loadConfig(name)
    })

    let deleteElement =  $('<li ><a class ="dropdown-item" href="#">'+name+'</a></li>')
    deleteDropdown.prepend(deleteElement)
    deleteElement.on('click',()=>{
        deleteConfig(loadElement,deleteElement,name)
    })
}

function flashAlert(message){
    //shows and hides a alert
    alert.html(message)
    alert.fadeIn(300)
    setTimeout(()=>{
        alert.fadeOut(300)
    },2000)
}