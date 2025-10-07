// jsdom setup for client tests
Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
  value: () => 'data:image/png;base64,test',
});


