all: output/data.utf8.txt output/data.txt

output/data.utf8.txt: raw/*
	./build_data.py >$@

output/data.txt: output/data.utf8.txt
	iconv -f utf8 -t euc-kr $< > $@

clean:
	rm -f output/data.txt output/data.utf8.txt
