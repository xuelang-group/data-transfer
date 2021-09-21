FROM node:12

RUN rm -f /etc/localtime \
&& ln -sv /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
&& echo "Asia/Shanghai" > /etc/timezone

WORKDIR /app
COPY package.json ./
RUN npm --registry http://registry.npm.taobao.org install --production
COPY ./dist ./

CMD [ "bash" ]