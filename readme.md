# ScriptDiddy

Some scripts for Logic Pro X (lpx) Scripter

**Watch [Demo Video](https://www.youtube.com/watch?v=cInvIxaeYZ4)**


### Install

To install or update, open Terminal and paste:

```sh
echo "\n\n Installing scripter plugins... \n\n" &&\
cd /tmp &&\
curl --silent -L "https://github.com/stereosteve/ScriptDiddy/archive/refs/heads/main.zip" -o ScriptDiddy.zip &&\
rm -rf ScriptDiddy-main &&\
unzip -qq ScriptDiddy.zip &&\
mkdir -p ~/Music/Audio\ Music\ Apps/Plug-In\ Settings/Scripter/stereosteve &&\
cp ScriptDiddy-main/stereosteve/* ~/Music/Audio\ Music\ Apps/Plug-In\ Settings/Scripter/stereosteve &&\
cd - &&\
echo "\n\n ALL SET \n\n"
```
