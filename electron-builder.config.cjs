const config = {
  appId: 'com.frostplayer.desktop',
  productName: 'Frost Player',
  executableName: 'frost-player',
  directories: {
    app: '.',
    output: 'dist-packages',
    buildResources: 'build'
  },
  files: [
    'dist/**',
    'dist-electron/**',
    'package.json',
    'README.md',
    'src/renderer/index.html',
    'src/renderer/**/*.css',
    '!src/**',
    '!**/*.map',
    '!**/*.test.*',
    '!**/*.spec.*'
  ],
  extraResources: [
    {
      from: 'resources',
      to: 'resources',
      filter: ['**/*']
    }
  ],
  asar: true,
  linux: {
    target: ['AppImage', 'deb'],
    category: 'Audio',
    synopsis: 'Desktop music player for Linux Mint',
    maintainer: 'Frost Player contributors',
    desktop: {
      Name: 'Frost Player',
      Comment: 'A desktop music player for Linux Mint',
      Terminal: false,
      Type: 'Application',
      Icon: 'frost-player'
    },
    icon: 'build/icons/frost-player',
    artifactName: 'Frost-Player-${version}-${arch}.${ext}'
  },
  appImage: {
    artifactName: 'Frost-Player-${version}-${arch}.AppImage'
  },
  deb: {
    artifactName: 'frost-player_${version}_${arch}.deb',
    depends: ['libgtk-3-0', 'libnss3', 'libasound2']
  }
};

module.exports = config;
