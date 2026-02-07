# Footloose2

This project is public but currently in internal dogfooding and not an official release yet.

```sh
# Quick start (default settings)
mkdir dogfooding && cd $_
npx @footloose2/app start -p 3000 -b ./bookmark.json
# http://localhost:3000/
```

```sh
# Custom configuration
mkdir dogfooding && cd $_
npx @footloose2/app eject
npx @footloose2/app start -p 3000 -b ./bookmark.json -c ./config.ts -s ./app.css -t "%y/%m/%d %H:%M:%S"
# http://localhost:3000/
```

```sh
# Show help
npx @footloose2/app -h
npx @footloose2/app start -h
npx @footloose2/app eject -h
```
