import re, pandas as pd, numpy as np

KEYS_REG = ['G','GS','MP','PER','TS%','3PAr','FTr','ORB%','DRB%','TRB%','AST%','STL%','BLK%','TOV%','USG%','OWS','DWS','WS','WS48','OBPM','DBPM','BPM','VORP']
KEYS_PO  = ['G','MP','PER','TS%','3PAr','FTr','ORB%','DRB%','TRB%','AST%','STL%','BLK%','TOV%','USG%','OWS','DWS','WS','WS48','OBPM','DBPM','BPM','VORP']

def parse_regular(path, season):
    rows = []
    head_pat = re.compile(
        r'^\d+\s+(?P<name>.+?)\s+(?P<age>\d{2})\s+(?P<team>[A-Z0-9]{2,3})\s+(?P<pos>[A-Za-z-]+)\s+(?P<rest>.+)$'
    )
    num_pat = re.compile(r'^-?\d*\.?\d+$')
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            m = head_pat.match(line)
            if not m:
                continue
            tokens = m.group('rest').split()
            nums = []
            for t in tokens:
                if num_pat.match(t):
                    nums.append(float(t))
                else:
                    break  # stop at first non-numeric token (e.g. Awards text)
            if len(nums) < len(KEYS_REG):
                continue
            row = dict(zip(KEYS_REG, nums[:len(KEYS_REG)]))
            row['name'] = m.group('name').strip()
            row['age'] = int(m.group('age'))
            row['pos'] = m.group('pos')
            row['season'] = season
            rows.append(row)
    return pd.DataFrame(rows)

def parse_playoffs(path, season):
    rows = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line.startswith('|'):
                continue
            if 'Rk' in line or '---' in line:
                continue
            cells = [c.strip() for c in line.split('|')[1:-1]]
            if len(cells) < 26:
                continue
            name = re.sub(r'\[|\]', '', cells[1]).strip()
            try:
                pos = cells[2]
                age = int(cells[3])
                nums = []
                for c in cells[5:27]:
                    c = c.strip()
                    nums.append(np.nan if c == '' else float(c))
            except (ValueError, IndexError):
                continue
            if len(nums) < len(KEYS_PO):
                continue
            row = dict(zip(KEYS_PO, nums[:len(KEYS_PO)]))
            row['name'] = name
            row['age'] = age
            row['pos'] = pos
            row['season'] = season
            rows.append(row)
    return pd.DataFrame(rows)

reg22 = parse_regular('_raw_2022_regular.txt', 2022)
reg23 = parse_regular('_raw_2023_regular.txt', 2023)
po22 = parse_playoffs('_raw_2022_playoffs.md', 2022)
po23 = parse_playoffs('_raw_2023_playoffs.md', 2023)
po24 = parse_playoffs('_raw_2024_playoffs.md', 2024)

print("reg22", len(reg22), "reg23", len(reg23), "po22", len(po22), "po23", len(po23), "po24", len(po24))
reg22.to_csv('parsed_reg22.csv', index=False)
reg23.to_csv('parsed_reg23.csv', index=False)
po22.to_csv('parsed_po22.csv', index=False)
po23.to_csv('parsed_po23.csv', index=False)
po24.to_csv('parsed_po24.csv', index=False)
