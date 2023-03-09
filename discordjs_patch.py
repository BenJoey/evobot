with open("node_modules/@discordjs/voice/dist/index.js", "r") as f:
    contents = f.readlines()

contents.insert(1361, "\t\tthis.configureNetworking();\n")

with open("node_modules/@discordjs/voice/dist/index.js", "w") as f:
    contents = "".join(contents)
    f.write(contents)