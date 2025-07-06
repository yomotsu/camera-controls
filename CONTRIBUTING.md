# INSTALL

Pre-requisites:

- Install [nvm](https://github.com/nvm-sh/nvm), then:
  ```sh
  $ nvm install
  $ nvm use
  $ node -v # make sure your version satisfies package.json#engines.node
  ```
  nb: if you want this node version to be your default nvm's one: `nvm alias default node`
- Install npm:
  ```sh
  $ corepack enable
  $ corepack prepare --activate # it reads "packageManager"
  $ npm -v # make sure your version satisfies package.json#engines.npm
  ```

```sh
$ npm ci
```

# Development

```sh
$ npm run dev
$ open http://localhost:3000/basic.html
```