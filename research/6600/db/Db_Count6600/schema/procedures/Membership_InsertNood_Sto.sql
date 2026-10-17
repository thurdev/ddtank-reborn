-- SQL_STORED_PROCEDURE dbo.Membership_InsertNood_Sto (modified 2012-04-21T07:53:25.060)
--Author：keny Date：2009-12-31 Description：添加后台功能权限

CREATE proc Membership_InsertNood_Sto
@noodeId int,  --根节点的ID
@ModuleName nvarchar(20),
@Url nvarchar(200),
@fatherRoot int, --判断是否有父节点
@addTime nvarchar(20)
as

declare @num int,  -- 判断是否有子节点，并记录该值
@moduleId int,
@ParModuleId int,
@likeNum nvarchar(20)
begin 
set @likeNum = substring(convert(varchar,@noodeId),1,1)
select @num = max(moduleid) from db_membership.dbo.mem_module where parmoduleid like @likeNum+'%'
if(@num is null)
set @moduleId = @noodeId+1
else
set @moduleId = @num+1
--以上是判断mem_moeule表中的ModuleId
if(@fatherRoot = 0) --没有父节点情况
set @ParModuleId = @noodeId
else
set @ParModuleId = @fatherRoot

insert db_membership.dbo.mem_module values(3,@moduleId,@ModuleName,@ParModuleId,@addTime,@Url)
if(@@error=0)
insert db_membership.dbo.mem_right values(3,@moduleId,@ModuleName+'<查看>',@moduleId*100,@ModuleName+'<查看>',@addTime)
end
GO
