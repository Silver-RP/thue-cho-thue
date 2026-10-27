# Bảng chấm giao diện (ui_check)

Supervisor dùng bảng này ở bước 7a của `/autodev:supervise` khi chấm ảnh. Vòng làm đẹp do leader giao cũng dùng bảng này.

**Ảnh cần chấm:** `yarn -s e2e:screens` chụp 5 trạng thái, mỗi trạng thái ở khổ 390 px và 1280 px: sổ trống, S2 (vượt ngưỡng), S1 (dưới ngưỡng), Tính nhanh, ngày 01/02/2027.

**Chấm thế nào:**
- Mỗi tiêu chí cho 0, 1 hoặc 2 điểm, chấm trên ảnh thật.
- Mỗi điểm kèm một câu bằng chứng, chỉ rõ ảnh nào và vùng nào.
- **Đạt khi tổng từ 16/20 trở lên và không tiêu chí nào 0 điểm.**

| # | Tiêu chí | 2 điểm | 1 điểm | 0 điểm |
|---|---|---|---|---|
| 1 | Trả lời trước | Ở 390 px, màn hình đầu (cao 800 px) thấy ngay có phải nộp không, khoảng bao nhiêu, hạn ngày nào | Thấy đủ ba ý nhưng phải cuộn hoặc đọc kỹ | Không thấy, hoặc bị form che |
| 2 | Phân cấp | Mỗi màn hình có một điểm nhấn; tiêu đề, số chính, chữ phụ khác cấp rõ | Có điểm nhấn nhưng nhiều khối cùng nặng | Mọi thứ cùng cỡ, hoặc chữ phụ lấn số chính |
| 3 | Khoảng cách và lưới | Lề, khoảng giữa khối đều theo một nhịp; các cạnh thẳng hàng | Vài chỗ lệch hoặc dồn | Khối dính nhau, lề mỗi nơi một kiểu |
| 4 | Màu và trạng thái | Dùng token màu; trạng thái phải nộp, an toàn, sắp hạn, quá hạn có cả chữ hoặc biểu tượng, không chỉ dựa vào màu | Đúng token nhưng có trạng thái chỉ phân biệt bằng màu | Màu lạ ngoài token, hoặc trạng thái không phân biệt được |
| 5 | Không vỡ | Không tràn, không cắt chữ, không chồng lấn; số dài xuống dòng gọn | Một chỗ xuống dòng xấu | Có tràn ngang, chữ bị cắt hoặc chồng lấn |
| 6 | Nút và ô nhập | Mọi nút và ô theo kiểu chung (không còn kiểu mặc định của trình duyệt), cao từ 44 px, nút chính rõ ràng | Còn 1–2 nút hoặc ô kiểu mặc định | Nhiều nút kiểu mặc định, hoặc không biết nút nào là chính |
| 7 | Số liệu | Số căn phải, chữ số đều cột, đơn vị rõ; bảng và thẻ dễ dò | Đúng số nhưng căn lề hoặc đơn vị lẫn lộn | Khó đọc số, hoặc cùng một số hiện kiểu khác nhau ở hai nơi |
| 8 | Trống, lỗi, ước tính | Sổ trống, năm chưa có luật, "ước tính" đều nói bước tiếp theo trong một câu | Có nói nhưng dài hoặc nằm xa chỗ cần | Ngõ cụt: chỉ báo, không có đường đi tiếp |
| 9 | Hai khổ màn hình | 390 px gọn, có thanh dưới; 1280 px dùng hết bề ngang, không có cột dài trống; cùng một ngôn ngữ thiết kế | Một khổ tốt, khổ kia còn thô | Một khổ vỡ hoặc trông như hai app khác nhau |
| 10 | Tin cậy | Căn cứ luật, ngày cập nhật, câu miễn trừ hiện gọn, không lấn át phần chính | Có nhưng rườm hoặc lẫn vào nội dung | Thiếu căn cứ, hoặc khối pháp lý chiếm màn hình đầu |

**Ghi kết quả** vào `docs/screens/<mốc hoặc vòng>/score.md`, gồm:
- Bảng: tiêu chí, điểm, bằng chứng.
- Tổng điểm.
- 3 chỗ nên sửa nhất, xếp theo thứ tự ảnh hưởng tới người dùng (vai V1–V6 trong `docs/autodev/CRITICS.md`).
- So với vòng trước: tiêu chí nào tăng, tiêu chí nào tụt.
