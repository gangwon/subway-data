all: output/seoul.utf8.txt output/seoul.txt

output/seoul.utf8.txt: seoul/*
	./build_data.py seoul >$@

output/seoul.txt: output/seoul.utf8.txt
	iconv -f utf8 -t euc-kr $< > $@

clean:
	rm -f output/seoul.txt output/seoul.utf8.txt
