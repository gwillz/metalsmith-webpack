var webpack = require('webpack')

var mode = "development"

module.exports = {
    mode: mode,
    plugins: [
        new webpack.EnvironmentPlugin({
            NODE_ENV: mode,
        }),
    ]
}
