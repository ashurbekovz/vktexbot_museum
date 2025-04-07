const easyvk = require('easyvk');
const uid = require('uid');
const fs = require('fs');
const latex = require('node-latex');
const PDFImage = require("pdf-image").PDFImage;
const { Readable } = require('stream');
const tempWrite = require('temp-write');
const sharp = require('sharp');

messageKeyboards = {
  "help" : {
    text : "",
    keyboard: {
      one_time: false,
      buttons: [
        [{
          action: {
            type: "text",
            payload: {command: "inlineHelp"},
            label: "Помощь"
          },
          color: "primary"
        }]
      ]
    }
  },
  "inlineHelp" : {
    text : "Текст нужно вводить в LaTeX формате, заключая математические формулы в $ ... $, $$ ... $$ или их аналоги. Пример корректного сообщения: \n \n VkTeX $\\int_a^b f(x) \\, dx$ \n \n С подробным описанием функций можно ознакомиться по ссылке.",
    keyboard : {
      inline: true,
      buttons: [
        [{
          action: {
            type: "open_link",
            link: "https://vk.com/@vktexbot-obnovlenie-bota-vktex-ot-04052020",
            label: "Список функций"
          }
        }]
      ]
    }
  }
}

groupsInfo = {
  test : {
    token : "",
    appeal1 : "[club194766396|@vktexbottest]",
    appeal2 : "[club194766396|@club194766396]",
  },
  stable : {
    token : "",
    appeal1 : "[club192377579|@vktexbot]",
    appeal2 : "[club192377579|@club192377579]",
  }
}

curGroup = groupsInfo.test;

easyvk({
  token: curGroup.token,
  v: '5.103',
  utils: {
    longpoll: true,
    uploader: true,
    bots: true
  }
}).then((vk) => {
  async function getMessage (msgArray = []) {
    const MESSAGE_ID__INDEX = 1;
    console.log(msgArray);
    return vk.call('messages.getById', {
      message_ids: msgArray[MESSAGE_ID__INDEX]
    });
  }

  async function sendMessageText (idUser, messageText, messageKeyboard) {
    vk.call('messages.send', {
      peer_id: idUser,
      message: messageText,
      random_id: easyvk.randomId(),
      keyboard: JSON.stringify(messageKeyboard)
    }).catch((error) => {
      console.log(error);
    });
  }

  async function sendMessagePhoto (idUser, messagePhotoPath, messageKeyboard) {
    try {
      url = await vk.uploader.getUploadURL('photos.getMessagesUploadServer', {}, false);
      fileData = await vk.uploader.uploadFile(url, messagePhotoPath, 'photo', {});
      fileData = await vk.post('photos.saveMessagesPhoto', fileData);
      fileData = fileData[0];
      const attachments = [`photo${fileData.owner_id}_${fileData.id}_${fileData.access_key}`];
      await vk.call('messages.send', {
        peer_id: idUser,
        attachment: attachments,
        random_id: easyvk.randomId(),
        keyboard: JSON.stringify(messageKeyboard)
      })
    } catch (error) {
      console.log(error);
      await sendMessageText(idUser, "Неизвестная ошибка");
    }
  }

  async function replyToMessage(fullMessage) {
    if (fullMessage.text) {
      curKeyboard = messageKeyboards["help"].keyboard;
      if (fullMessage.peer_id >= 2000000000) {
        curKeyboard = {};
        if (fullMessage.text.substring(0, curGroup.appeal1.length) == curGroup.appeal1) {
          fullMessage.text = fullMessage.text.substring(curGroup.appeal1.length);
        } else if ((fullMessage.text.substring(0, curGroup.appeal2.length) == curGroup.appeal2)) {
          fullMessage.text = fullMessage.text.substring(curGroup.appeal2.length);
        } else {
          return;
        }
      }
      
      splitMessage = fullMessage.text.split(' ');
      flagsMap = new Map(Object.entries({
        "-crop": false,
        "-mobile": false,
        "-long": false,
        "-longlong": false,
        "-c": false,
        "-l": false,
        "-l2": false,
        "-l3": false,
        "-m": false,
        "-wa": false,
        "-ha": false
      }));
      
      let ind = 0;
      for (; ind < splitMessage.length; ++ind) {
        if (flagsMap.has(splitMessage[ind])) {
          flagsMap[splitMessage[ind]] = true;
        } else if (splitMessage[ind] != "") {
          break;
        }
      }
      fullMessage.text = splitMessage.slice(ind, splitMessage.length).join(' ');
      if (!fullMessage.text) {
        fullMessage.text = "-";
      }
      if (fullMessage.payload) {
        command = JSON.parse(fullMessage.payload).command;
        if (messageKeyboards.hasOwnProperty(command)) {
          sendMessageText(fullMessage.peer_id, messageKeyboards[command].text, messageKeyboards[command].keyboard);
        }
      } else {
        let curName = await tempWrite('unicorn');
        let textWidthCm = "8.3";
        if (flagsMap["-l3"]) {
          textWidthCm = "18";
        } else if (flagsMap["-longlong"] || flagsMap["-l2"]) {
          textWidthCm = "15";
        } else if (flagsMap["-long"] || flagsMap["-l"]) {
          textWidthCm = "12";
        }
        const input = (`
          \\documentclass[preview,border=20pt,20pt]{standalone}
          \\setlength{\\textwidth}{` + textWidthCm + `cm}
          \\usepackage{amsmath,amsthm,amssymb,amsfonts,mathtools,mathtext,physics,tikz,bigints}
          \\usepackage[T1,T2A]{fontenc}
          \\usepackage[utf8]{inputenc}
          \\usepackage[english,russian]{babel}
          \\usepackage{listings}
          \\usepackage{xcolor}

          \\definecolor{codegreen}{rgb}{0,0.6,0}
          \\definecolor{codegray}{rgb}{0.5,0.5,0.5}
          \\definecolor{codepurple}{rgb}{0.58,0,0.82}
          \\definecolor{backcolour}{rgb}{0.95,0.95,0.92}
          
          \\lstdefinestyle{mystyle}{
              backgroundcolor=\\color{backcolour},   
              commentstyle=\\color{codegreen},
              keywordstyle=\\color{magenta},
              numberstyle=\\tiny\\color{codegray},
              stringstyle=\\color{codepurple},
              basicstyle=\\ttfamily\\footnotesize,
              breakatwhitespace=false,         
              breaklines=true,                 
              captionpos=b,                    
              keepspaces=true,                 
              numbers=left,                    
              numbersep=5pt,                  
              showspaces=false,                
              showstringspaces=false,
              showtabs=false,                  
              tabsize=2
          }
          
          \\lstset{style=mystyle}

          \\begin{document}` + 
          fullMessage.text + 
          `\\end{document}`
        );
        const output = fs.createWriteStream(curName);
        const optionsTeX = {
          cmd: "pdflatex",
          passes: 2
        }
        const pdf = latex(input, optionsTeX);

        pdf.pipe(output);

        pdf.on('error', async (error) => {
          sendMessageText(fullMessage.peer_id, error.message.split('\n').slice(0, -1).join('\n'), curKeyboard);
          fs.unlink(curName, (error) => {
          });
        });

        pdf.on('finish', async () => {
          let pdfImage = new PDFImage(curName, {
            combinedImage: true,
            convertOptions: {
              "-density": "400",
              "-trim":""
            }
          });
          let imagePath = await pdfImage.convertFile().catch((err) => {console.log(err)});
          let curImage = await sharp(imagePath);
          let hs, ws;
          curImage = await curImage.metadata().then((metadata) => {
            ws = metadata.width;
            hs = metadata.height;
            if ((!flagsMap["-crop"]) && (!flagsMap["-c"])) {
              if ((flagsMap["-mobile"]) || (flagsMap['-m'])) {
                let k1 = 1.8;
                hs += Math.max(0, (ws / k1) - hs);
              }
              ws = Math.max(ws, 1335);
            }
            let k2 = 19;
            hs += Math.max(0, ws - (k2 * hs)) / k2;
            ws += Math.max(0, hs - (k2 * ws)) / k2;
            if (flagsMap["-wa"]) {
              ws += 30;
            }
            if (flagsMap["-ha"]) {
              hs += 30;
            }
            ws = Math.round(ws);
            hs = Math.round(hs);
            let wa = Math.round((ws - metadata.width) / 2);
            let ha = Math.round((hs - metadata.height) / 2);
            return curImage.extend({
              top: ha,
              bottom: ha,
              left: wa,
              right: wa,
              background: {r:256,g:256,b:256,alpha:1}
            });
          });
          if (hs <= 5000) {
            let imagePath2 = imagePath.slice(0, -4) + "-new2.png";
            await curImage.toFile(imagePath2);
            await sendMessagePhoto(fullMessage.peer_id, imagePath2, curKeyboard);
            fs.unlink(curName, (error) => {
              fs.unlink(imagePath, (error) => {
                fs.unlink(imagePath2, (error) => {});
              });
            });
          } else {
            sendMessageText(fullMessage.peer_id, "Слишком много строк, попробуйте отправить текст несколькими сообщениями.", curKeyboard);
            fs.unlink(curName, (error) => {
              fs.unlink(imagePath, (error) => {
              });
            });
          }
        });
      }
    }
  }

  vk.bots.longpoll.connect().then(connection => {
    connection.on('message_edit', (fullMessage) => {
      replyToMessage(fullMessage);
    });
    connection.on('message_new', (fullMessage) => {
      replyToMessage(fullMessage.message);
    });
  });
});
