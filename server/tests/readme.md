# 解説

このディレクトリには以下のリソースが含まれている。

- fixtures ... バリデーションテストのデータ
- files ... ツリー構造を持ったリソース
- archives ... files の圧縮ファイル

## files の概要

- エントリ名にはわざと空白を入れている
- 日本語エントリには濁点と半濁点を使っている (NFC/NFD 検証のため)
- 空ディレクトリあり
- 0 バイトファイルあり
- 不可視ファイルあり

## files のツリー構造

.
├── .hidden_file
├── 1 text.txt
├── 1 ゲーム
│   ├── .hidden_file
│   ├── 1 オープンワールド
│   │   ├── 1 テキスト.txt
│   │   ├── 1 空ディレクトリ
│   │   └── 2 画像.jpg
│   ├── 1 テキスト.txt
│   ├── 2 画像.jpg
│   └── 2 空ディレクトリ
├── 2 image.jpg
├── 2 movies
│   ├── .hidden_file
│   ├── 1 action
│   │   ├── 1 text.txt
│   │   └── 2 image.jpg
│   ├── 1 text.txt
│   ├── 2 comedy
│   │   ├── 1 text.txt
│   │   └── 2 image.jpg
│   ├── 2 image.jpg
│   └── 3 blank
└── 3 blank

## archives

圧縮ファイルは以下の三種類である。
それぞれ、ディレクトリエントリの有り無しで二パターンある。
コマンドは files をルートとして実行する。

### zip

#### ディレクトリエントリあり

dir-entries.zip

```sh
zip -r ../archives/dir-entries.zip .
```

#### ディレクトリエントリなし

no-dir-entries.zip

```sh
zip -r ../archives/no-dir-entries.zip "./1 ゲーム/2 空ディレクトリ" "./1 ゲーム/1 オープンワールド/1 テキスト.txt" "./1 ゲーム/1 オープンワールド/2 画像.jpg" "./1 ゲーム/1 オープンワールド/1 空ディレクトリ" "./1 ゲーム/1 テキスト.txt" "./1 ゲーム/2 画像.jpg" "./1 ゲーム/.hidden_file" "./2 movies/2 image.jpg" "./2 movies/3 blank" "./2 movies/1 action/2 image.jpg" "./2 movies/1 action/1 text.txt" "./2 movies/1 text.txt" "./2 movies/.hidden_file" "./2 movies/2 comedy/2 image.jpg" "./2 movies/2 comedy/1 text.txt" "./2 image.jpg" "./3 blank" "./1 text.txt" "./.hidden_file"
```

### tar

#### ディレクトリエントリあり

dir-entries.tar

```sh
tar cvf ../archives/dir-entries.tar .
```

#### ディレクトリエントリなし

no-dir-entries.tar

```sh
tar cvf ../archives/no-dir-entries.tar "./1 ゲーム/2 空ディレクトリ" "./1 ゲーム/1 オープンワールド/1 テキスト.txt" "./1 ゲーム/1 オープンワールド/2 画像.jpg" "./1 ゲーム/1 オープンワールド/1 空ディレクトリ" "./1 ゲーム/1 テキスト.txt" "./1 ゲーム/2 画像.jpg" "./1 ゲーム/.hidden_file" "./2 movies/2 image.jpg" "./2 movies/3 blank" "./2 movies/1 action/2 image.jpg" "./2 movies/1 action/1 text.txt" "./2 movies/1 text.txt" "./2 movies/.hidden_file" "./2 movies/2 comedy/2 image.jpg" "./2 movies/2 comedy/1 text.txt" "./2 image.jpg" "./3 blank" "./1 text.txt" "./.hidden_file"
```

### tgz

#### ディレクトリエントリあり

dir-entries.tgz

```sh
tar cvfz ../archives/dir-entries.tgz .
```

#### ディレクトリエントリなし

no-dir-entries.tgz

```sh
tar cvfz ../archives/no-dir-entries.tgz "./1 ゲーム/2 空ディレクトリ" "./1 ゲーム/1 オープンワールド/1 テキスト.txt" "./1 ゲーム/1 オープンワールド/2 画像.jpg" "./1 ゲーム/1 オープンワールド/1 空ディレクトリ" "./1 ゲーム/1 テキスト.txt" "./1 ゲーム/2 画像.jpg" "./1 ゲーム/.hidden_file" "./2 movies/2 image.jpg" "./2 movies/3 blank" "./2 movies/1 action/2 image.jpg" "./2 movies/1 action/1 text.txt" "./2 movies/1 text.txt" "./2 movies/.hidden_file" "./2 movies/2 comedy/2 image.jpg" "./2 movies/2 comedy/1 text.txt" "./2 image.jpg" "./3 blank" "./1 text.txt" "./.hidden_file"
```
