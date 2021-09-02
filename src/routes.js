const router = require("express").Router();
const { pipeline, Readable, Transform } = require("stream");
const { promisify } = require("util");
const { createWriteStream } = require("fs");
const { sendMessage } = require("../whatsapp");

router.post("/sendMessage", async (req, res) => {
  const { message } = req.body;
  const { phones } = req.body;

  const pipelineAsync = promisify(pipeline);
  {
    const readableStream = Readable({
      read() {
        phones.forEach(function (number) {
          const data = JSON.stringify(number);
          readableStream.push(data);
        });
        readableStream.push(null);
      },
    });

    const sendMessageMap = new Transform({
      transform(chunk, encoding, callback) {
        const data = JSON.parse(chunk);
        const result = `${data}\n`;
        sendMessage(data, message);
        callback(null, result);
      },
    });

    await pipelineAsync(
      readableStream,
      sendMessageMap,
      createWriteStream("db.csv")
    );
  }
});

module.exports = router;
