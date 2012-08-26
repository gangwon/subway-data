#!/usr/bin/python
import re
import os.path

def split_raw_to_blocks(raws):
    prep = [(r.strip(), r[0].isspace())
            for r in raws if not(re.match(r'^\w*(#.*)?$', r))]
    blocks = []
    (code, intervals) = (None, [])
    for r, indented in prep:
        if indented:
            if code:
                intervals.append(r)
            else:
                raise NameError('Parsing error')
        else:
            blocks.append((code, intervals))
            (code, intervals) = (r, [])
    blocks.append((code, intervals))
    return blocks[1:]

def read_raw(filename):
    f = open(filename, 'r')
    blocks = split_raw_to_blocks(f.readlines())
    f.close()
    return blocks

def generate_sequence(code):
    tokens = [t.strip() for t in code.split(' ') if t.strip() != '']
    ranges = [t for t in tokens if t[0] != '^']
    excludes = [t[1:] for t in tokens if t[0] == '^']

    sequence = []
    for r in ranges:
        rtokens = r.split('~')
        if len(rtokens) == 1:
            sequence.append(r)
        elif len(rtokens) == 2:
            (begin, end) = (rtokens[0], rtokens[1])
            if len(begin) != len(end):
                raise NameError('Invalid sequence code')
            prefix = os.path.commonprefix([begin, end])
            begin = begin[len(prefix):]
            end = end[len(prefix):]
            sequence += [(prefix + '%0' + str(len(begin)) + 'd') % i
                         for i in range(int(begin), int(end) + 1)]
        else:
            raise NameError('Invalid sequence code')

    return [s for s in sequence if not(s in excludes)]

def rewrite_block(block):
    (code, interval) = block
    return (generate_sequence(code), interval[::2], interval[1::2])

def uniquify(l):
    d = {}
    r = []
    for elem in l:
        if elem in d:
            continue
        d[elem] = 1
        r.append(elem)
    return r

def merge_blocks(blocks):
    station_dict = {}
    station_order = []
    intervals = []

    for b in blocks:
        (sequence, stations, dists) = rewrite_block(b)
        if len(sequence) != len(stations):
            raise NameError('The number of stations does not match')
        station_dict.update(zip(sequence, stations))
        station_order += sequence
        intervals.append((sequence, dists))
        for num, name in zip(sequence, stations):
            if station_dict[num] != name:
                raise NameError('The name of station is inconsistent')

    return (station_dict, uniquify(station_order), intervals)

def generate_station_list(station_dict, order, line):
    return [(num, station_dict[num], line) for num in order]

def generate_dist_list(station_dict, intervals):
    result = []
    for nums, dists in intervals:
        if len(nums) != len(dists) + 1:
            raise NameError('Invalid interval list')
        for i, d in enumerate(dists):
            (src, dest) = (nums[i], nums[i + 1])
            forward = backward = False
            if d[-1] == '_':
                forward = True
                d = d[:-1]
            elif d[-1] == '^':
                backward = True
                d = d[:-1]
            else:
                forward = backward = True
            if forward:
                result.append((src, dest, int(d)))
            if backward:
                result.append((dest, src, int(d)))

    return result

lines = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'I1', 'K1', 'K2', 'K3', 'AREX', 'D']

stations = []
dists = []
for line in lines:
    blocks = read_raw('raw/' + line)
    (station_dict, nums, intervals) = merge_blocks(read_raw('raw/' + line))
    stations += generate_station_list(station_dict, nums, line)
    dists += generate_dist_list(station_dict, intervals)

for num, name, line in stations:
    print num, name, line
print
for src, dest, dist in dists:
    print src, dest, dist
