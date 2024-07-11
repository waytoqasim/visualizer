import { Asset } from "expo-asset";
import { StatusBar } from "expo-status-bar";
import { Platform, StyleSheet, Text, View, TouchableOpacity  } from "react-native";
import { WebView } from "react-native-webview";
import { useRef, useEffect, useState } from "react";
import * as FileSystem from "expo-file-system";
import { Audio } from 'expo-av';

export default function App() {
  const webViewRef = useRef(null);
  const [audio, setAudio] = useState("");
  const [pageSolid, setPageSolid] = useState("");
  const [pageParticles, setPageParticles] = useState("");
  const [pageLoaded, setPageLoaded] = useState(false);
  const [showSolid, setShowSolid] = useState(false);

  const [recording, setRecording] = useState();
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  const assets = [
    require("./assets/page.html"),
    require("./assets/script.mjs"),
    require("./assets/particles.mjs"),
  ];

  const htmlPages = []

  async function startRecording() {
    try {
      if (permissionResponse.status !== 'granted') {
        console.log('Requesting permission..');
        await requestPermission();
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync( Audio.RecordingOptionsPresets.HIGH_QUALITY );
      setRecording(recording);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    console.log('Stopping recording..');
    setRecording(undefined);
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync(
      {
        allowsRecordingIOS: false,
      }
    );
    const uri = recording.getURI();
    console.log('Recording stopped and stored at', uri);
    let audio
    if(Platform.OS === 'web')
    {
      audio = await loadBuffer(uri);
      audio = _arrayBufferToBase64(audio)
    }
    else
    {
      audio = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64",
      });
    }

    setAudio(audio);
  }

  function _arrayBufferToBase64( buffer ) {
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
      binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
  }

  useEffect(() => {
    const readFiles = async () => {
      const [htmlAsset] = await Asset.loadAsync(assets[0]);
      const [scriptAsset] = await Asset.loadAsync(assets[1]);
      const [scriptAsset1] = await Asset.loadAsync(assets[2]);

      const isWeb = Platform.OS === 'web'

      const html = isWeb ? await loadFile(htmlAsset.localUri) : await FileSystem.readAsStringAsync(htmlAsset.localUri)
      const js = isWeb ?  await loadFile(scriptAsset.localUri)  : await FileSystem.readAsStringAsync(scriptAsset.localUri);
      const js1 = isWeb ?  await loadFile(scriptAsset1.localUri)  : await FileSystem.readAsStringAsync(scriptAsset1.localUri);
      setPageSolid(html.replace("[main-script]", js));
      setPageParticles(html.replace("[main-script]", js1));
    };

    readFiles();
  }, []);

  useEffect(() => {
    if (!audio || !pageLoaded) return;
    postMessage(audio);
  }, [audio, pageLoaded]);

  const loadFile = async (url) => await fetch(url).then(response => response.text()).catch(e => console.error(e));
  const loadBuffer = async (url) => await fetch(url).then(response => response.arrayBuffer()).catch(e => console.error(e));;
  const handleMessage = (message = null) => {
    console.log("got", message?.nativeEvent?.data.substring(0, 100));
  };

  const postMessage = (message) => {
    console.log('Hallo')
    console.log(message)
    if(Platform.OS === 'web' && document.getElementById('simulation'))
      document.getElementById('simulation').contentWindow.postMessage(message, '*')
    else
      webViewRef.current?.injectJavaScript(`receiveMessage('${message}'); true;`);
    console.log(webViewRef)
  };

  return (
    <View style={styles.container}>
      {pageSolid ? (
        <>
        { (Platform.OS === 'web') ? (<View style={styles.container}>
          <iframe
              id={'simulation'}
              srcDoc={showSolid ? pageSolid :  pageParticles}
              style={styles.iframe}
              title={showSolid ? 'Solid Page' : 'Particles Page'}
              onLoad={() => {
                setPageLoaded(true);
              }}
          />
        </View>) :
            (showSolid ?
                <WebView
                    ref={webViewRef}
                    style={{ flex: 1 }}
                    source={{ html: pageSolid }}
                    mediaPlaybackRequiresUserAction={false}
                    mixedContentMode={"always"}
                    originWhitelist={["*"]}
                    onMessage={handleMessage}
                    onLoadEnd={() => {
                      setPageLoaded(true);
                    }}
                />
                :
                <WebView
                    ref={webViewRef}
                    style={{ flex: 1 }}
                    source={{ html: pageParticles }}
                    mediaPlaybackRequiresUserAction={false}
                    mixedContentMode={"always"}
                    originWhitelist={["*"]}
                    onMessage={handleMessage}
                    onLoadEnd={() => {
                      setPageLoaded(true);
                    }}
                />)
        }
        <View style={styles.buttonsWrap}>
          <View style={styles.buttonsContainer}>
            <TouchableOpacity style={styles.button} onPress={()=>{ setShowSolid(!showSolid) }}>
              <Text style={styles.buttonText}>{showSolid ? 'Solid' : '3D'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={recording ? stopRecording : startRecording}>
              <Text style={styles.buttonText}>{recording ? 'Stop Recording' : 'Start Recording'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
      ) : (
        <Text>Loading</Text>
      )}

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  buttonsWrap: {
    position: 'absolute',
    bottom: 0, 
    left: 0,
    right: 0,
    zIndex: 1,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  button:{
    flex: 1,
    backgroundColor: 'aqua',
    marginHorizontal: 5,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    paddingVertical: 7,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  iframe: {
    flex: 1,
    borderWidth: 0,
  },
});
