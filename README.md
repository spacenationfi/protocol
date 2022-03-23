# Orbit

## Contracts
Bundle crypto assets into baskets represented by ERC20 tokens. Launch Indecies, structured products, and leveraged tokens on AURORA.

## Contributing
We highly encourage participation from the community to help shape the development of Orbit. If you are interested in developing on top of Orbit's code and oracles, or have any questions, please ping us on Discord.


## Testing
0. Docker Set up

    Firstly, you need to install Docker. The easiest way is to follow the Instructions on https://docs.docker.com/install/#supported-platforms

    You need to pull the docker image that you want to use by using the following command:

    ```
    docker pull ethereum/solc:0.5.7
    ```

    If you wish not to set up docker, you can turn off the `docker: true` flag in truffle.js

1. Run yarn install

    ```
    yarn install
    ```

2. Run an ethereum chain on a separate terminal window

    ```
    yarn chain
    ```

3. Run unit tests

    ```
    yarn test
    ```
