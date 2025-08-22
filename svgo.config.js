module.exports = {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: { overrides: { removeViewBox: false } }
    },
    {
      name: 'addAttributesToSVGElement',
      params: {
        attributes: [{ stroke: 'currentColor', width: '24', height: '24' }]
      }
    }
  ]
}

