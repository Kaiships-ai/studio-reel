# Digits to English words for align.py: whisper writes "238", "$9,000", "100,000", "1,"; the script says the words.
#   words("238") -> "two hundred thirty-eight" · words("$9,000") -> "nine thousand" · words("50%") -> "fifty percent"
# Integers up to the billions; "$", ",", a trailing "." and "%" are stripped first. Returns None for anything that is not
# a plain number (then align.py keeps the token as heard). Tens are hyphenated as a script writes them ("thirty-four").
import re

ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split()
TENS = ' ten twenty thirty forty fifty sixty seventy eighty ninety'.split(' ')
SCALES = [(10 ** 9, 'billion'), (10 ** 6, 'million'), (1000, 'thousand')]


def say_int(n):
    if n < 20: return ONES[n]
    if n < 100: return TENS[n // 10] + ('-' + ONES[n % 10] if n % 10 else '')
    if n < 1000: return ONES[n // 100] + ' hundred' + (' ' + say_int(n % 100) if n % 100 else '')
    for v, name in SCALES:
        if n >= v: return say_int(n // v) + ' ' + name + (' ' + say_int(n % v) if n % v else '')


def words(token):
    t = token.strip()
    pct = t.rstrip('.,;:!?').endswith('%')
    t = re.sub(r'[$,%]', '', t).rstrip('.;:!?')
    if not re.fullmatch(r'\d{1,12}', t) or int(t) >= 10 ** 12: return None
    return say_int(int(t)) + (' percent' if pct else '')
