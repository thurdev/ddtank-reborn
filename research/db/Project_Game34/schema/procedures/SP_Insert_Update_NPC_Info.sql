-- SQL_STORED_PROCEDURE dbo.SP_Insert_Update_NPC_Info (modified 2021-06-04T01:29:18.180)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：加入一条用户申请结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Update_NPC_Info] 
		   @ID int,
           @Name nvarchar(50),
           --@Level int,
           --@Camp int,
           --@Type int,
           --@X int,
           --@Y int,
           --@Width int,
           --@Height int,
           --@Blood int,
           --@MoveMin int,
           --@MoveMax int,
           --@BaseDamage int,
           --@BaseGuard int,
           --@Defence int,
           --@Agility int,
           --@Lucky int,
           --@Attack int,
           --@ModelID nvarchar(1000),
           --@ResourcesPath nvarchar(1000),
           --@DropRate nvarchar(50),
           --@Experience int,
           --@Delay int,
           --@Immunity int,
           --@Alert int,
           --@Range int,
           --@Preserve int,
           --@Script nvarchar(50),
           --@FireX int,
           --@FireY int,
           --@DropId int,
           @setUpdate int
AS

declare @count int

select @count= isnull(count(*),0) from [NPC_Info] where ID = @ID
if (@count <> 0 and @setUpdate = 0)
begin
UPDATE [dbo].[NPC_Info]
   SET --[ID] = @ID
      [Name] = @Name
      --,[Level] = @Level
      --,[Camp] = @Camp
      --,[Type] = @Type
      --,[X] = @X
      --,[Y] = @Y
      --,[Width] = @Width
      --,[Height] = @Height
      --,[Blood] = @Blood
      --,[MoveMin] = @MoveMin
      --,[MoveMax] = @MoveMax
      --,[BaseDamage] = @BaseDamage
      --,[BaseGuard] = @BaseGuard
      --,[Defence] = @Defence
      --,[Agility] = @Agility
      --,[Lucky] = @Lucky
      --,[Attack] = @Attack
      --,[ModelID] = @ModelID
      --,[ResourcesPath] = @ResourcesPath
      --,[DropRate] = @DropRate
      --,[Experience] = @Experience
      --,[Delay] = @Delay
      --,[Immunity] = @Immunity
      --,[Alert] = @Alert
      --,[Range] = @Range
      --,[Preserve] = @Preserve
      --,[Script] = @Script
      --,[FireX] = @FireX
      --,[FireY] = @FireY
      --,[DropId] = @DropId
 WHERE  [ID] = @ID
return 1  
end
--add db
else 
begin
--INSERT INTO [dbo].[NPC_Info]
--           ([ID]
--           ,[Name]
--           ,[Level]
--           ,[Camp]
--           ,[Type]
--           ,[X]
--           ,[Y]
--           ,[Width]
--           ,[Height]
--           ,[Blood]
--           ,[MoveMin]
--           ,[MoveMax]
--           ,[BaseDamage]
--           ,[BaseGuard]
--           ,[Defence]
--           ,[Agility]
--           ,[Lucky]
--           ,[Attack]
--           ,[ModelID]
--           ,[ResourcesPath]
--           ,[DropRate]
--           ,[Experience]
--           ,[Delay]
--           ,[Immunity]
--           ,[Alert]
--           ,[Range]
--           ,[Preserve]
--           ,[Script]
--           ,[FireX]
--           ,[FireY]
--           ,[DropId])
--     VALUES
--           (@ID,
--           @Name,
--           @Level,
--           @Camp,
--           @Type,
--           @X,
--           @Y,
--           @Width,
--           @Height,
--           @Blood,
--           @MoveMin,
--           @MoveMax,
--           @BaseDamage,
--           @BaseGuard,
--           @Defence,
--           @Agility,
--           @Lucky,
--           @Attack,
--           @ModelID,
--           @ResourcesPath,
--           @DropRate,
--           @Experience,
--           @Delay,
--           @Immunity,
--           @Alert,
--           @Range,
--           @Preserve,
--           @Script,
--           @FireX,
--           @FireY,
--           @DropId)
           
return 0
           end
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end









GO
