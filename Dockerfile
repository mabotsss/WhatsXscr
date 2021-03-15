FROM nandoscrz/whatsxscr:1.0
RUN apk update && apk upgrade

RUN git clone https://github.com/mabotsss/WhatsXscr /root/WhatsXscr
WORKDIR /root/WhatsXscr/
ENV TZ=Asia/Jakarta
RUN npm install supervisor -g
RUN npm install

CMD ["node", "bot.js"]
