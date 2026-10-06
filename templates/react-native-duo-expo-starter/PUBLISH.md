# Publish as `CAWRESTLER/react-native-duo-expo-starter`

Cloud Agent could not create a new GitHub repository with the available token. From a machine with org repo create access:

```sh
cd templates/react-native-duo-expo-starter
git init
git checkout -b main
git add -A
git commit -m "feat: minimal Expo Router starter for @cawrestler/react-native-duo"
gh repo create CAWRESTLER/react-native-duo-expo-starter --public --source=. --remote=origin --push
gh repo edit CAWRESTLER/react-native-duo-expo-starter --template \
  --description "Minimal Expo Router + New Architecture starter for @cawrestler/react-native-duo"
```

Then open the React Native Directory PR (see `docs/submissions/react-native-directory.md`).
