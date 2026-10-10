# Môi trường bàn giao dữ liệu

Owner xác nhận trong chat: test đạt trên Mac, có phiên bản/lệnh tái lập là đủ
cho GM-04. Windows-only không chặn merge task này; tương thích runtime Windows
sẽ kiểm riêng khi cần. Các guard portability bên dưới không claim Windows Pass.

Đường chạy được hỗ trợ cho toàn bộ pipeline lịch sử: **Linux, macOS hoặc Linux
trong WSL2**. Python3.12+, IANA timezone database, Git; full regression/audit cần
pandas/lxml đã có trong runtime. Contract runner mới chỉ dùng stdlib/zoneinfo.
Không thay dependency ứng dụng hoặc gọi lại API/GPT để kiểm dữ liệu.

## Windows và WSL

Mở Ubuntu trong WSL2, dùng **Python/Git Linux trong WSL**, clone repo vào filesystem
Linux, chọn branch PR. Không dùng python.exe Windows để chạy pipeline khóa cache.
Nếu chưa có WSL/Ubuntu/Python/tzdata thì cần chuẩn bị môi trường trước; không coi
import được module là đã chạy đầy đủ pipeline. Có thể kiểm runtime từ WSL:

```sh
uname -s
python3 --version
python3 -X utf8 -c "import fcntl, pandas, lxml; from zoneinfo import ZoneInfo; print(ZoneInfo('Asia/Ho_Chi_Minh'))"
git check-attr text eol -- supabase/seed/templates/core-v1.template.json data-preparation/snapshots/thu_duc_dishes_taxonomy.csv
python3 -X utf8 scripts/build_field_contracts.py --check
python3 -X utf8 scripts/validate_field_contracts.py --cases --report /tmp/gm04-cases.json
python3 -X utf8 -m unittest discover -s tests -p 'test_field_contracts.py'
python3 -X utf8 -m unittest discover -s tests -p 'test_*.py'
python3 -X utf8 data-preparation/scripts/validate_data_preparation.py --report-dir /tmp/gm04-audit
```

`fcntl` là khóa POSIX của pipeline GPT lịch sử. Windows có thể import module để
xem/kiểm offline, nhưng gọi run có khóa sẽ báo lỗi yêu cầu WSL **trước khi chạm
cache**. Không fallback chạy không khóa. Test dùng mock client, không credentials.

Native Windows full pipeline **không được công bố hỗ trợ**; native Windows và WSL
chưa được chạy trong phiên sửa này. Evidence macOS và CI Linux ghi riêng ở CHECKS;
không suy CI Linux thành Windows/WSL Pass. Field runner mới dùng encoding UTF-8
tường minh; vẫn cần IANA tzdata để kiểm timezone trên mọi hệ điều hành.

## Newline và checksum

Code/contract JSON/Markdown mới đọc UTF-8, builder ghi UTF-8/LF bằng newline tường
minh. `.gitattributes` áp LF ngay cả khi core.autocrlf=true. Checks vẫn so **bytes**,
không normalize trước checksum để che drift. Test tạo repo autocrlf và checkout
lại để xác nhận generated JSON cùng byte, CSV giữ BOM/CRLF.

Snapshot/config/template/evidence legacy được đánh -text để Git không chuyển
newline. CSV giữ nguyên BOM/CRLF; không chạy git add --renormalize hoặc rewrite
snapshots. Manifest relative paths được audit bằng POSIX `/`. Generator fixture
food-data-v1 byte-pinned giữ nguyên cùng manifest; dùng -X utf8 cho các lần đọc
legacy còn phụ thuộc default encoding. Các runtime source đã sửa UTF-8/paths/lock
được kê riêng trong evidence, không tuyên bố toàn bộ source legacy bất biến.
