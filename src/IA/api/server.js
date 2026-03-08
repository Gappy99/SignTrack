const express = require("express")
const app = express()

app.use(express.json())

app.post("/translate", (req,res)=>{

    const sign = req.body.sign

    res.json({
        text: sign
    })

})

app.listen(3000, ()=>{

    console.log("API running")

}                                                                                      )