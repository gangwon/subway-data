all: \
     output/seoul.utf8.txt output/seoul.txt \
     output/busan.utf8.txt output/busan.txt

output/seoul.utf8.txt: seoul/*
	./build_data.py seoul >$@

output/seoul.txt: output/seoul.utf8.txt
	iconv -f utf8 -t euc-kr $< > $@

output/busan.utf8.txt: busan/*
	./build_data.py busan >$@

output/busan.txt: output/busan.utf8.txt
	iconv -f utf8 -t euc-kr $< > $@

clean:
	rm -f output/seoul.txt output/seoul.utf8.txt
	rm -f output/busan.txt output/busan.utf8.txt
