-- SQL_STORED_PROCEDURE dbo.SP_Insert_Update_TemplateAlllist (modified 2021-06-04T01:29:18.277)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：加入一条用户申请结婚信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Insert_Update_TemplateAlllist] 
		   @TemplateID int,
           @Name nvarchar(50),
           --@Remark nvarchar(200),
           @CategoryID int,
           @Description nvarchar(200),
           @Attack int,
           @Defence int,
           @Agility int,
           @Luck int,
           @Level int,
           @Quality int,
           @Pic nvarchar(200),
           @MaxCount int,
           @NeedSex int,
           @NeedLevel int,
           @CanStrengthen bit,
           @CanCompose bit,
           @CanDrop bit,
           @CanEquip bit,
           @CanUse bit,
           @CanDelete bit,
           @Script nvarchar(200),
           @Data nvarchar(1000),
           @Colors nvarchar(1000),
           @Property1 int,
           @Property2 int,
           @Property3 int,
           @Property4 int,
           @Property5 int,
           @Property6 int,
           @Property7 int,
           @Property8 int,
           --@Valid int,
           --@Count int,
           --@AddTime datetime,
           @BindType int,
           @FusionType int,
           @FusionRate int,
           @FusionNeedRate int,
           @Hole nvarchar(50),
           @RefineryLevel int,
           @ReclaimValue int,
		   @ReclaimType int,
		   @CanRecycle int,
		   @SuitId int,
		   --@FloorPrice int,
		   --@SuitId int,
		   --@CanTransfer int,
		   @setUpdate int

AS

declare @countItems int

select @countItems= isnull(count(*),0) from Shop_Goods where TemplateID  = @TemplateID
if (@countItems <> 0 and @setUpdate = 0)
begin
 update [dbo].[Shop_Goods] 
set 
	   [TemplateID] =@TemplateID
      ,[Name] =@Name
      ,[Remark] =''
      ,[CategoryID] =@CategoryID
      ,[Description] =@Description
      ,[Attack] =@Attack
      ,[Defence] =@Defence
      ,[Agility] =@Agility
      ,[Luck] =@Luck
      ,[Level] =@Level
      ,[Quality] =@Quality
      ,[Pic] =@Pic
      ,[MaxCount] =@MaxCount
      ,[NeedSex] =@NeedSex
      ,[NeedLevel] =@NeedLevel
      ,[CanStrengthen] =@CanStrengthen
      ,[CanCompose] =@CanCompose
      ,[CanDrop] =@CanDrop
      ,[CanEquip] =@CanEquip
      ,[CanUse] =@CanUse
      ,[CanDelete] =@CanDelete
      ,[Script] =@Script
      ,[Data] =@Data
      ,[Colors] =@Colors
      ,[Property1] =@Property1
      ,[Property2] =@Property2
      ,[Property3] =@Property3
      ,[Property4] =@Property4
      ,[Property5] =@Property5
      ,[Property6] =@Property6
      ,[Property7] =@Property7
      ,[Property8] =@Property8
      ,[Valid] =0
      ,[Count] =0
      ,[AddTime] = GETDATE()
      ,[BindType] =@BindType
      ,[FusionType] =@FusionType
      ,[FusionRate] =@FusionRate
      ,[FusionNeedRate] =@FusionNeedRate
      ,[Hole] =@Hole
      ,[RefineryLevel] =@RefineryLevel
	  ,[ReclaimValue] =@ReclaimValue
	  ,[ReclaimType] =@ReclaimType
	  ,[CanRecycle] =@CanRecycle
	  ,[SuitId] = @SuitId
	  --,[FloorPrice] =@FloorPrice
	  --,[SuitId] =@SuitId
      where TemplateID  = @TemplateID  --and LoveProclamation = @LoveProclamation 
      
return 1
end
--add Ball
else 
begin
INSERT INTO [dbo].[Shop_Goods]
           ([TemplateID]
           ,[Name]
           ,[Remark]
           ,[CategoryID]
           ,[Description]
           ,[Attack]
           ,[Defence]
           ,[Agility]
           ,[Luck]
           ,[Level]
           ,[Quality]
           ,[Pic]
           ,[MaxCount]
           ,[NeedSex]
           ,[NeedLevel]
           ,[CanStrengthen]
           ,[CanCompose]
           ,[CanDrop]
           ,[CanEquip]
           ,[CanUse]
           ,[CanDelete]
           ,[Script]
           ,[Data]
           ,[Colors]
           ,[Property1]
           ,[Property2]
           ,[Property3]
           ,[Property4]
           ,[Property5]
           ,[Property6]
           ,[Property7]
           ,[Property8]
           ,[Valid]
           ,[Count]
           ,[AddTime]
           ,[BindType]
           ,[FusionType]
           ,[FusionRate]
           ,[FusionNeedRate]
           ,[Hole]
           ,[RefineryLevel]
           ,[ReclaimValue]
           ,[ReclaimType]
           ,[CanRecycle]
		   ,[SuitId])
		   --,[FloorPrice]
           --,[SuitId])
     VALUES
           (@TemplateID,
           @Name,
           '',
           @CategoryID,
           @Description,
           @Attack,
           @Defence,
           @Agility,
           @Luck,
           @Level,
           @Quality,
           @Pic,
           @MaxCount,
           @NeedSex,
           @NeedLevel,
           @CanStrengthen,
           @CanCompose,
           @CanDrop,
           @CanEquip,
           @CanUse,
           @CanDelete,
           @Script,
           @Data,
           @Colors,
           @Property1,
           @Property2,
           @Property3,
           @Property4,
           @Property5,
           @Property6,
           @Property7,
           @Property8,
           0,
           0,
           GETDATE(),
           @BindType,
           @FusionType,
           @FusionRate,
           @FusionNeedRate,
           @Hole,
           @RefineryLevel,
           @ReclaimValue,
		   @ReclaimType,
		   @CanRecycle,
		   @SuitId)
		   --@FloorPrice,
		  -- @SuitId)
		   
return 0
		   end
if(@@error <> 0)
begin
  return 2 ---Return false insert error
end








GO
