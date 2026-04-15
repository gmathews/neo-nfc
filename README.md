# Understanding neoband software

## Note about the card's data structure

### MIFARE Classic EV1 1K
- 1024 × 8 bit EEPROM memory
- 16 sectors of 4 blocks
- see https:www.nxp.com/docs/en/data-sheet/MF1S50YYX_V1.pdf

### MIFARE Classic EV1 4K
- 4096 × 8 bit EEPROM memory
- 32 sectors of 4 blocks and 8 sectors of 16 blocks
- see https:www.nxp.com/docs/en/data-sheet/MF1S70YYX_V1.pdf

One block contains 16 bytes.
Don't forget specify the blockSize argument blockSize=16 in reader.read and reader.write calls.
The smallest amount of data to write is one block. You can write only the entire blocks (card limitation).

sector 0
 block 0 - manufacturer data (read only)
 block 1 - data block
 block 2 - data block
 block 3 - sector trailer 0
  bytes 00-05: Key A (default 0xFFFFFFFFFFFF) (6 bytes)
  bytes 06-09: Access Bits (default 0xFF0780) (4 bytes)
  bytes 10-15: Key B (optional) (default 0xFFFFFFFFFFFF) (6 bytes)
sector 1:
 block 4 - data block
 block 5 - data block
 block 6 - data block
 block 7 - sector trailer 1
sector 2:
 block 8 - data block
 block 9 - data block
 block 10 - data block
 block 11 - sector trailer 2
... and so on ...

### Reading and Writing Data
Reading and writing data from/to MIFARE Classic cards (e.g. MIFARE 1K) ALWAYS requires authentication!
Writing might require to authenticate with a different key (based on the sector access conditions)
#### How does the MIFARE Classic authentication work?
1. You authenticate to a specific sector using a specific key (key + keyType).
2. After the successful authentication, you are granted permissions according to the access conditions
   for the given key (access conditions are specified in the trailer section of each sector).
   Depending on the access conditions, you can read from / write to the blocks of this sector.
3. If you want to access data in another sectors, you have to authenticate to that sector.
   Then you can access the data from the block within that sector (only from that sector).
summary: MIFARE Classic will only grant permissions based on the last authentication attempt.
         Consequently, if multiple reader.authenticate(...) commands are used,
         only the last one has an effect on all subsequent read/write operations.

reader.authenticate(blockNumber, keyType, key, obsolete = false)
- blockNumber - the number of any block withing the sector we want to authenticate
- keyType - type of key - either KEY_TYPE_A or KEY_TYPE_B
- key - 6 bytes - a Buffer instance, an array of bytes, or 12-chars HEX string
- obsolete - (default - false for PC/SC V2.07) use true for PC/SC V2.01

# Trouble Shooting
to delete a user:
```bash
sqlite3 neo-nfc.db "DELETE FROM feedback WHERE uid = '8bf55407'; DELETE FROM card_data WHERE uid = '8bf55407';"
```
to clear today's feedback:
```bash
sqlite3 neo-nfc.db "
    DELETE FROM feedback
    WHERE uid = '8bf55407'
      AND created_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', 'localtime', 'start of day', 'utc');
    DELETE FROM card_data
    WHERE uid = '8bf55407'
      AND created_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', 'localtime', 'start of day', 'utc');
  "
```

# Script
Excuse me, I see that you are augmented.
*points at their neoband*
If you like, I can tell your fortune for a few credits. Can I see your hand?
*\<affirmative consent\>*
*have them place their palm, so the neoband touches the reader*

*\<have them come back any time to show others\>*
*\<free; if they bring another person to have their fortune told\>*
*\<pyramid scheme\>*

