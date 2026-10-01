-- SQL_STORED_PROCEDURE dbo.SP_Consortia_Skill_UpGrade (modified 2021-06-04T05:18:34.977)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：公会保管箱升级>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Consortia_Skill_UpGrade]
 @ConsortiaID int, 
 @UserID int
AS

declare @Level int
declare @Riches int
declare @SkillLevel int
select @Level=[Level],@Riches=Riches,@SkillLevel=SkillLevel from Consortia where ConsortiaID=@ConsortiaID and ChairmanID=@UserID and IsExist=1

if @Level is null or @Level=0
begin
  return 2
end

if @Level<=@SkillLevel
begin
  return 3
end


set @SkillLevel=@SkillLevel+1

declare @SkillRiches int
select @SkillRiches=BufferRiches from Consortia_Level where [Level]=@SkillLevel 

if @SkillRiches is null or @SkillRiches=0
begin
  return 4
end

if @Riches<@SkillRiches
begin
  return 5
end

--set @Riches=@Riches+@Reward-@NeedRiches

Update Consortia set SkillLevel=SkillLevel+1,Riches=@Riches-@SkillRiches where ConsortiaID=@ConsortiaID and IsExist=1

if @@error<>0
begin
  return @@error
end

return 0










GO
