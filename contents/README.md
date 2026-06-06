# contents/ 素材目录

## 命名建议

```text
contents/
  01-章节名/
    讲义.txt
    案例.pdf
    截图-学员A-01.png
```

- 本课例 PDF 抽图请**显式指定文件**（目录内可能有多份 PDF）：
  ```bash
  python tools/python/extract_pdf_images.py --pdf contents/<你的PDF文件名>.pdf --out assets/pdf-extracted
  python tools/python/extract_pdf_images.py --pdf contents/<你的PDF文件名>.pdf --page 5,7-9
  ```

输出：`assets/pdf-extracted/page-NN-img-M.jpeg` 与 `page-NN.txt`。

抽图后**必须压缩**（抽图产物常 > 80 KB）：

```bash
python tools/python/compress_web_assets.py
```

标准与阈值见 [`../docs/guides/IMAGE_COMPRESSION_GUIDE.md`](../docs/guides/IMAGE_COMPRESSION_GUIDE.md)。

脚本帮助：`python tools/python/extract_pdf_images.py --help`。文档索引：[`../docs/guides/README.md`](../docs/guides/README.md)。
