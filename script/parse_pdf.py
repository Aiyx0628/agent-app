import requests
import json
import os
import base64
from pathlib import Path

# ================= 配置区 =================
API_URL = "http://47.97.46.88:8893/file_parse"
PDF_FILE_PATH = "data/xxx.pdf"
OUTPUT_DIR = "output"  # 输出文件夹，将包含 md 文件和 images 子目录
# ==========================================


def parse_pdf(file_path: str, output_dir: str):
    """调用 MinerU 3 远程服务解析文档，将 Markdown 和图片一起保存到输出文件夹。"""
    if not os.path.exists(file_path):
        print(f"❌ 找不到文件: {file_path}")
        return

    pdf_name = Path(file_path).stem
    out_path = Path(output_dir) / pdf_name
    images_path = out_path / "images"
    images_path.mkdir(parents=True, exist_ok=True)

    print(f"⏳ 正在上传并解析 '{file_path}'，请稍候...")

    file_handle = open(file_path, "rb")
    files = {
        "files": (os.path.basename(file_path), file_handle, "application/pdf")
    }
    data = {
        "format": "markdown",
        "backend": "pipeline",
        "return_images": "true",
    }
    headers = {"Accept": "application/json"}

    try:
        response = requests.post(API_URL, headers=headers, files=files, data=data)
        response.raise_for_status()
        result_json = response.json()

        md_content, images = _extract_result(result_json)

        if not md_content:
            print("⚠️ 无法定位到 Markdown 内容，服务器原始返回：")
            print(json.dumps(result_json, indent=2, ensure_ascii=False))
            return

        saved_count = _save_images(images, images_path)

        md_file = out_path / f"{pdf_name}.md"
        md_file.write_text(md_content, encoding="utf-8")

        print(f"✅ 解析成功！")
        print(f"   Markdown: {md_file}")
        print(f"   图片数量: {saved_count}，保存在: {images_path}")

    except requests.exceptions.RequestException as e:
        print(f"❌ 请求 API 失败: {e}")
        if "response" in locals() and response is not None:
            print(f"服务器返回信息: {response.text}")
    except json.JSONDecodeError:
        print("❌ 返回数据不是合法 JSON。")
        print(f"原始返回内容: {response.text}")
    finally:
        file_handle.close()


def _extract_result(result_json: dict) -> tuple[str, dict]:
    """从 MinerU 返回的 JSON 中提取 md_content 和 images。

    兼容 MinerU 3.x 新版结构和旧版结构。
    """
    md_content = ""
    images: dict = {}

    if "results" in result_json and isinstance(result_json["results"], dict):
        for _key, file_data in result_json["results"].items():
            if isinstance(file_data, dict):
                md_content = file_data.get("md_content", "")
                images = file_data.get("images", {})
                if md_content:
                    break
    elif "content" in result_json:
        md_content = result_json["content"]
    elif "data" in result_json and "content" in result_json.get("data", {}):
        md_content = result_json["data"]["content"]
    elif "markdown" in result_json:
        md_content = result_json["markdown"]

    return md_content, images


def _save_images(images: dict, images_path: Path) -> int:
    """将 base64 编码的图片保存到本地文件夹，返回保存数量。"""
    count = 0
    for img_name, img_data in images.items():
        if not img_data:
            continue
        if img_data.startswith("data:"):
            _, img_data = img_data.split(",", 1)
        try:
            raw = base64.b64decode(img_data)
            (images_path / img_name).write_bytes(raw)
            count += 1
        except Exception as e:
            print(f"⚠️ 保存图片 {img_name} 失败: {e}")
    return count


if __name__ == "__main__":
    parse_pdf(PDF_FILE_PATH, OUTPUT_DIR)