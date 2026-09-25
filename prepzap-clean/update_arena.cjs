const fs = require('fs');

let content = fs.readFileSync('src/pages/Arena.tsx', 'utf8');

const search = `        const { error: insertError } = await supabase.from("exam_rooms").insert({
          code, host_id: user.id, room_name: roomName.trim(), topic: topicLabel,
          questions, mode, difficulty, question_count: questionCount, time_limit: timeLimit, status: "waiting", is_public: isPublic,
        });`;

const replace = `        const { data, error: invokeError } = await supabase.functions.invoke("moderate-and-insert", {
          body: {
            action: "create_exam_room",
            payload: {
              code, room_name: roomName.trim(), topic: topicLabel,
              questions, mode, difficulty, question_count: questionCount, time_limit: timeLimit, status: "waiting", is_public: isPublic,
            }
          }
        });
        
        let insertError = invokeError;
        // If the Edge function caught a 400 validation error, supabase-js might return it in \`error\` or as part of the response object.
        if (data && data.error) insertError = new Error(data.error);`;

content = content.replace(search, replace);
fs.writeFileSync('src/pages/Arena.tsx', content, 'utf8');
