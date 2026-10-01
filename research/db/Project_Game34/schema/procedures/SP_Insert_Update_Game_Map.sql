-- SQL_STORED_PROCEDURE dbo.SP_Insert_Update_Game_Map (modified 2021-06-04T01:29:18.150)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：加入一条用户申请结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Update_Game_Map] 
		   @ID int,
           @Name nvarchar(50),
           @Description nvarchar(2000),
           @ForegroundWidth int,
           @ForegroundHeight int,
           @BackroundWidht int,
           @BackroundHeight int,
           @DeadWidth int,
           @DeadHeight int,
           @Weight int,
           @DragIndex int,
           @ForePic nvarchar(200),
           @BackPic nvarchar(200),
           @DeadPic nvarchar(200),
           @Pic nvarchar(200),
           @Remark nvarchar(50),
           @BackMusic nvarchar(200),
           @PosX nvarchar(200),
           @Type int,
           @PosX1 nvarchar(200),
           @setUpdate int
AS

declare @count int

select @count= isnull(count(*),0) from [Game_Map] where ID = @ID
if (@count <> 0 and @setUpdate = 0)
begin
UPDATE [dbo].[Game_Map]
   SET [ID] = @ID
      ,[Name] = @Name
      ,[Description] = @Description
      --,[ForegroundWidth] = @ForegroundWidth
      --,[ForegroundHeight] = @ForegroundHeight
      --,[BackroundWidht] = @BackroundWidht
      --,[BackroundHeight] = @BackroundHeight
      --,[DeadWidth] = @DeadWidth
      --,[DeadHeight] = @DeadHeight
      --,[Weight] = @Weight
      --,[DragIndex] = @DragIndex
      --,[ForePic] = @ForePic
      --,[BackPic] = @BackPic
      --,[DeadPic] = @DeadPic
      --,[Pic] = @Pic
      --,[Remark] = @Remark
      --,[BackMusic] = @BackMusic
      ----,[PosX] = @PosX
      --,[Type] = @Type
      ----,[PosX1] = @PosX1
 WHERE [ID] = @ID
return 1  
end
--add Game_Map
else 
begin
INSERT INTO [dbo].[Game_Map]
           ([ID]
           ,[Name]
           ,[Description]
           ,[ForegroundWidth]
           ,[ForegroundHeight]
           ,[BackroundWidht]
           ,[BackroundHeight]
           ,[DeadWidth]
           ,[DeadHeight]
           ,[Weight]
           ,[DragIndex]
           ,[ForePic]
           ,[BackPic]
           ,[DeadPic]
           ,[Pic]
           ,[Remark]
           ,[BackMusic]
           ,[PosX]
           ,[Type]
           ,[PosX1])
     VALUES
           (@ID ,
           @Name,
           @Description,
           @ForegroundWidth,
           @ForegroundHeight,
           @BackroundWidht,
           @BackroundHeight,
           @DeadWidth,
           @DeadHeight,
           @Weight,
           @DragIndex,
           @ForePic,
           @BackPic,
           @DeadPic,
           @Pic,
           @Remark,
           @BackMusic,
           @PosX,
           @Type,
           @PosX1)
           
return 0
           end
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end









GO
