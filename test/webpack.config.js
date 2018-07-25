var webpack = require('webpack')

module.exports = {
    mode: "development",
    plugins: [
        new webpack.DefinePlugin({
            config_variable: "'ooooh.'",
        }),
    ]
}
